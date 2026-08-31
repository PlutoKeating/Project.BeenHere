import type { ZodType } from "zod";

const securityHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

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
    { error: { code: "internal_error", message: "档案馆暂时无法完成这个请求。" } },
    { status: 500 },
  );
}

export function requireAdmin(request: Request): string {
  const email = request.headers.get("cf-access-authenticated-user-email");
  if (email) return email;

  const url = new URL(request.url);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (local && request.headers.get("x-local-admin") === "1") return "local-editor";

  throw new HttpError(401, "admin_auth_required", "编辑工作台需要 Cloudflare Access 身份。\n");
}

export function routeId(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length).split("/")[0];
  return value ? decodeURIComponent(value) : null;
}
