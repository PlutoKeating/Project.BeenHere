import { z } from "zod";
import { AccountModule } from "./accounts";
import { GovernanceModule } from "./governance";
import { clearSessionCookie, errorResponse, HttpError, json, methodNotAllowed, parseBody, requireSameOrigin, secureAssetResponse, setSessionCookie } from "./http";
import { RecordManagementModule } from "./record-management";
import { RecordRepository } from "./record-repository";
import { connectPresence } from "./presence";
import type { Account, Env, RecordDraft } from "./types";

const webUrl = z.url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), "链接必须使用 http 或 https。");
export const draftSchema: z.ZodType<RecordDraft> = z.object({
  ingestionMethod: z.literal("automated_interview").optional(),
  participant: z.object({
    displayName: z.string().trim().min(1).max(80),
    identityMode: z.enum(["real_name", "pseudonym", "anonymous"]),
  }),
  conductedAt: z.iso.datetime({ offset: true }),
  messages: z.array(z.object({
    id: z.string().optional(),
    speakerRole: z.enum(["interviewer", "participant"]),
    body: z.string().trim().min(1).max(8000),
  })).min(2).max(100).superRefine((messages, context) => {
    if (!messages.some((message) => message.speakerRole === "interviewer")) context.addIssue({ code: "custom", message: "至少需要一条采访者消息。" });
    if (!messages.some((message) => message.speakerRole === "participant")) context.addIssue({ code: "custom", message: "至少需要一条被采访者消息。" });
  }),
  source: z.object({
    sourceType: z.enum(["douyin", "social_media", "in_person", "direct", "other"]),
    platformName: z.string().trim().max(80).optional(),
    canonicalUrl: webUrl.optional(),
  }),
});
const correctionSchema = z.object({
  recordNumber: z.string().regex(/^BH-\d{6}$/).optional(),
  requesterContact: z.string().trim().min(3).max(200),
  requesterRole: z.enum(["participant", "reader", "representative", "other"]),
  kind: z.enum(["fact", "identity", "privacy", "consent", "supplement", "withdrawal"]),
  description: z.string().trim().min(10).max(4000),
});
const emailSchema = z.email().max(254).transform((value) => value.trim().toLowerCase());
const passwordSchema = z.string().min(12, "密码至少需要 12 个字符。").max(128);
const tokenSchema = z.string().min(40).max(200);

async function authApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/auth/")) return null;
  const accounts = new AccountModule(env.DB, env);
  if (url.pathname === "/api/auth/register" && request.method === "POST") {
    await accounts.rateLimit(request, "register", 4);
    const body = await parseBody(request, z.object({ email: emailSchema, displayName: z.string().trim().min(2).max(40), password: passwordSchema }));
    await accounts.register(body.email, body.displayName, body.password);
    return json({ data: { message: "验证邮件已发送，请在 30 分钟内完成验证。" } }, { status: 202 });
  }
  if (url.pathname === "/api/auth/verify-email" && request.method === "POST") {
    const body = await parseBody(request, z.object({ token: tokenSchema })); const result = await accounts.verifyEmail(body.token);
    return json({ data: result.account }, { headers: { "set-cookie": setSessionCookie(result.token) } });
  }
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    await accounts.rateLimit(request, "login", 8);
    const body = await parseBody(request, z.object({ email: emailSchema, password: z.string().min(1).max(128) })); const result = await accounts.login(body.email, body.password);
    return json({ data: result.account }, { headers: { "set-cookie": setSessionCookie(result.token) } });
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") { await accounts.logout(request); return json({ data: { status: "signed_out" } }, { headers: { "set-cookie": clearSessionCookie() } }); }
  if (url.pathname === "/api/auth/forgot-password" && request.method === "POST") {
    await accounts.rateLimit(request, "forgot", 4); const body = await parseBody(request, z.object({ email: emailSchema })); await accounts.forgotPassword(body.email);
    return json({ data: { message: "如果账户存在，重设邮件已经发出。" } }, { status: 202 });
  }
  if (url.pathname === "/api/auth/reset-password" && request.method === "POST") {
    const body = await parseBody(request, z.object({ token: tokenSchema, password: passwordSchema })); const result = await accounts.resetPassword(body.token, body.password);
    return json({ data: result.account }, { headers: { "set-cookie": setSessionCookie(result.token) } });
  }
  if (url.pathname === "/api/auth/confirm-email-change" && request.method === "POST") { const body = await parseBody(request, z.object({ token: tokenSchema })); await accounts.confirmEmailChange(body.token); return json({ data: { status: "email_changed" } }, { headers: { "set-cookie": clearSessionCookie() } }); }
  if (url.pathname === "/api/auth/confirm-deletion" && request.method === "POST") { const body = await parseBody(request, z.object({ token: tokenSchema })); await accounts.confirmDeletion(body.token); return json({ data: { status: "account_deleted" } }, { headers: { "set-cookie": clearSessionCookie() } }); }
  return methodNotAllowed(["POST"]);
}

async function publicRateLimitId(request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const bucket = new Date().toISOString().slice(0, 13);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}:correction:${bucket}`));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function segment(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length).split("/")[0];
  return value ? decodeURIComponent(value) : null;
}

async function publicApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  const repository = new RecordRepository(env.DB);
  if (url.pathname === "/api/v1/meta") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await repository.meta() });
  }
  if (url.pathname === "/api/v1/records") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await repository.list(Number(url.searchParams.get("limit") ?? 24)) });
  }
  if (url.pathname.startsWith("/api/v1/records/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const recordNumber = segment(url.pathname, "/api/v1/records/");
    if (!recordNumber) throw new HttpError(400, "record_number_required", "缺少记录编号。\n");
    return json({ data: await repository.find(recordNumber.toUpperCase()) });
  }
  if (url.pathname === "/api/v1/drift") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const exclusions = url.searchParams.getAll("exclude").flatMap((value) => value.split(",")).filter(Boolean);
    return json({ data: await repository.drift(exclusions) });
  }
  if (url.pathname === "/api/v1/search") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await repository.search(url.searchParams.get("q") ?? "") });
  }
  if (url.pathname.startsWith("/api/v1/people/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await repository.byPerson(segment(url.pathname, "/api/v1/people/") ?? "") });
  }
  if (url.pathname.startsWith("/api/v1/years/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const year = segment(url.pathname, "/api/v1/years/");
    if (!year || !/^\d{4}$/.test(year)) throw new HttpError(400, "invalid_year", "年份无效。\n");
    return json({ data: await repository.byYear(year) });
  }
  if (url.pathname === "/api/v1/correction-requests") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const input = await parseBody(request, correctionSchema);
    const data = await new GovernanceModule(env.DB).submitCorrection(input, await publicRateLimitId(request));
    return json({ data }, { status: 201 });
  }
  return null;
}

async function accountRecordRoute(request: Request, url: URL, records: RecordManagementModule, account: Account): Promise<Response> {
  const recordId = segment(url.pathname, "/api/account/records/");
  if (!recordId) throw new HttpError(400, "record_id_required", "缺少采访记录 ID。\n");
  const base = `/api/account/records/${encodeURIComponent(recordId)}`;
  const action = url.pathname.slice(base.length);
  if (!action && request.method === "GET") return json({ data: await records.editable(recordId, account) });
  if (!action && request.method === "PATCH") {
    const body = await parseBody(request, z.object({ expectedRevision: z.number().int().positive(), draft: draftSchema }));
    return json({ data: await records.update(recordId, body.draft, body.expectedRevision, account) });
  }
  if (!action && request.method === "DELETE") {
    const body = await parseBody(request, z.object({ reason: z.string().trim().min(3).max(500) }));
    await records.remove(recordId, body.reason, account);
    return json({ data: { status: "deleted" } });
  }
  if (action === "/publish" && request.method === "POST") {
    const body = await parseBody(request, z.object({ changeSummary: z.string().trim().min(2).max(500) }));
    return json({ data: await records.publish(recordId, body.changeSummary, account) });
  }
  if (action === "/claim" && request.method === "POST") {
    const body = await parseBody(request, z.object({ requestText: z.string().trim().min(20).max(2000) }));
    return json({ data: await records.submitClaim(recordId, body.requestText, account) }, { status: 201 });
  }
  return methodNotAllowed(["GET", "PATCH", "POST", "DELETE"]);
}

async function accountApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/account/") && !url.pathname.startsWith("/api/director/")) return null;
  const accounts = new AccountModule(env.DB, env);
  const account = await accounts.authenticate(request);
  const records = new RecordManagementModule(env.DB);

  if (url.pathname === "/api/account/me") {
    if (request.method === "GET") return json({ data: account });
    if (request.method === "PATCH") {
      const body = await parseBody(request, z.object({ displayName: z.string().trim().min(2).max(40) }));
      return json({ data: await accounts.updateProfile(account, body.displayName) });
    }
    return methodNotAllowed(["GET", "PATCH"]);
  }
  if (url.pathname === "/api/account/password" && request.method === "PATCH") {
    await accounts.rateLimit(request, `password-change:${account.id}`, 5);
    const body = await parseBody(request, z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema }));
    const token = await accounts.changePassword(account, body.currentPassword, body.newPassword);
    return json({ data: { status: "password_changed" } }, { headers: { "set-cookie": setSessionCookie(token) } });
  }
  if (url.pathname === "/api/account/email" && request.method === "PATCH") {
    await accounts.rateLimit(request, `email-change:${account.id}`, 3);
    const body = await parseBody(request, z.object({ currentPassword: z.string().min(1).max(128), newEmail: emailSchema }));
    await accounts.requestEmailChange(account, body.currentPassword, body.newEmail);
    return json({ data: { message: "验证邮件已发送到新邮箱。" } }, { status: 202 });
  }
  if (url.pathname === "/api/account/deletion" && request.method === "POST") { await accounts.rateLimit(request, `deletion:${account.id}`, 3); await accounts.requestDeletion(account); return json({ data: { message: "删除确认邮件已发送。" } }, { status: 202 }); }
  if (url.pathname === "/api/account/records") {
    if (request.method === "GET") return json({ data: await records.mine(account) });
    if (request.method === "POST") return json({ data: await records.create(await parseBody(request, draftSchema), account) }, { status: 201 });
    return methodNotAllowed(["GET", "POST"]);
  }
  if (url.pathname.startsWith("/api/account/records/")) return accountRecordRoute(request, url, records, account);
  if (url.pathname === "/api/account/claims") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await records.claims(account) });
  }
  if (url.pathname.startsWith("/api/account/claims/") && url.pathname.endsWith("/review")) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const claimId = url.pathname.slice("/api/account/claims/".length, -"/review".length);
    const body = await parseBody(request, z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(1000).default("") }));
    await records.reviewClaim(claimId, body.decision, body.note, account);
    return json({ data: { status: body.decision } });
  }
  if (url.pathname === "/api/director/accounts") {
    accounts.requireDirector(account);
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await accounts.list() });
  }
  if (url.pathname.startsWith("/api/director/accounts/") && url.pathname.endsWith("/status")) {
    accounts.requireDirector(account);
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    const accountId = url.pathname.slice("/api/director/accounts/".length, -"/status".length);
    const body = await parseBody(request, z.object({ status: z.enum(["active", "suspended"]) }));
    await accounts.setStatus(accountId, body.status);
    return json({ data: { status: body.status } });
  }
  return null;
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  requireSameOrigin(request, env.SITE_URL, env.APP_ENV === "development");
  if (url.pathname === "/api/health") return json({ status: "ok", service: "project-been-here" });
  if (url.pathname === "/api/presence") return connectPresence(request, env);
  const authResponse = await authApi(request, env, url);
  if (authResponse) return authResponse;
  const publicResponse = await publicApi(request, env, url);
  if (publicResponse) return publicResponse;
  const accountResponse = await accountApi(request, env, url);
  if (accountResponse) return accountResponse;
  if (url.pathname.startsWith("/api/")) throw new HttpError(404, "route_not_found", "没有这个接口。\n");
  return secureAssetResponse(await env.ASSETS.fetch(request), env.APP_ENV === "production");
}

export default {
  async fetch(request: Request, env: Env) {
    try { return await handle(request, env); }
    catch (error) { return errorResponse(error); }
  },
} satisfies ExportedHandler<Env>;

export { handle };
export { PresenceRoom } from "./presence";
