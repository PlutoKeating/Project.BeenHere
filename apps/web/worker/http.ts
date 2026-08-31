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

export function sessionCookie(request: Request): string | null {
  const match = request.headers.get("cookie")?.match(/(?:^|;\s*)bh_session=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookie(token: string): string {
  return `bh_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie(): string {
  return "bh_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export function requireSameOrigin(request: Request, siteUrl: string, development = false): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (development && origin && ["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) return;
  if (origin !== new URL(siteUrl).origin) throw new HttpError(403, "invalid_origin", "请求来源无效。");
}

export function routeId(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length).split("/")[0];
  return value ? decodeURIComponent(value) : null;
}
