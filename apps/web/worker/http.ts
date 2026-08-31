import type { ZodType } from "zod";
import type { Env } from "./types";

const securityHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "x-frame-options": "DENY",
};

export function secureAssetResponse(response: Response, production: boolean): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("x-frame-options", "DENY");
  headers.set("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if (production) headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(securityHeaders)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "请求必须使用 application/json。\n");
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "invalid_json", "请求正文不是有效 JSON。\n");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(422, "invalid_request", result.error.issues[0]?.message ?? "请求字段无效。\n");
  }
  return result.data;
}

export function methodNotAllowed(allowed: string[]): Response {
  return json(
    { error: { code: "method_not_allowed", message: "此路径不支持当前方法。" } },
    { status: 405, headers: { allow: allowed.join(", ") } },
  );
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message.trim() } }, { status: error.status });
  }
  console.error("Unhandled worker error", error);
  return json(
    { error: { code: "internal_error", message: "采访记录网站暂时无法完成这个请求。" } },
    { status: 500 },
  );
}

type AccessClaims = {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  nbf?: number;
};

type AccessKey = JsonWebKey & { kid?: string };

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function verifyAccessJwt(token: string, teamDomain: string, expectedAudience: string): Promise<AccessClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "invalid_access_token", "Cloudflare Access 凭据无效。\n");

  let header: { alg?: string; kid?: string };
  let claims: AccessClaims;
  try {
    header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]!))) as typeof header;
    claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]!))) as AccessClaims;
  } catch {
    throw new HttpError(401, "invalid_access_token", "Cloudflare Access 凭据无效。\n");
  }
  if (header.alg !== "RS256" || !header.kid) {
    throw new HttpError(401, "invalid_access_token", "Cloudflare Access 凭据无效。\n");
  }

  const origin = teamDomain.startsWith("https://") ? teamDomain.replace(/\/$/, "") : `https://${teamDomain.replace(/\/$/, "")}`;
  const response = await fetch(`${origin}/cdn-cgi/access/certs`);
  if (!response.ok) throw new HttpError(503, "access_verification_unavailable", "暂时无法验证编辑者身份。\n");
  const certificateSet = await response.json<{ keys?: AccessKey[] }>();
  const jwk = certificateSet.keys?.find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw new HttpError(401, "invalid_access_token", "Cloudflare Access 凭据无效。\n");

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(parts[2]!),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (!validSignature || !claims.email || !claims.exp || claims.exp <= now
    || (claims.nbf !== undefined && claims.nbf > now) || claims.iss !== origin
    || !audiences.includes(expectedAudience)) {
    throw new HttpError(401, "invalid_access_token", "Cloudflare Access 凭据无效。\n");
  }
  return claims;
}

export async function requireIdentity(request: Request, env: Env): Promise<string> {
  const url = new URL(request.url);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (env.APP_ENV === "development" && local && request.headers.get("x-local-user-email")) return request.headers.get("x-local-user-email")!;

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    throw new HttpError(503, "account_auth_not_configured", "账户登录尚未配置 Cloudflare Access。\n");
  }
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!assertion) throw new HttpError(401, "account_auth_required", "此操作需要登录。\n");
  return (await verifyAccessJwt(assertion, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD)).email!;
}

export function routeId(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length).split("/")[0];
  return value ? decodeURIComponent(value) : null;
}
