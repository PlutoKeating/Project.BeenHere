import { z } from "zod";
import { AccountModule } from "./accounts";
import { GovernanceModule } from "./governance";
import { errorResponse, HttpError, json, methodNotAllowed, parseBody, requireIdentity, secureAssetResponse } from "./http";
import { RecordManagementModule } from "./record-management";
import { RecordRepository } from "./record-repository";
import type { Env, RecordDraft } from "./types";

const slug = z.string().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const webUrl = z.url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), "链接必须使用 http 或 https。");
const draftSchema: z.ZodType<RecordDraft> = z.object({
  participant: z.object({
    slug,
    displayName: z.string().trim().min(1).max(80),
    identityMode: z.enum(["real_name", "pseudonym", "anonymous"]),
    bio: z.string().trim().max(500),
  }),
  record: z.object({
    title: z.string().trim().min(1).max(120),
    excerpt: z.string().trim().min(1).max(300),
    conductedAt: z.iso.datetime({ offset: true }),
    endedAt: z.iso.datetime({ offset: true }).optional(),
  }),
  story: z.array(z.string().trim().min(1).max(4000)).min(1).max(100),
  recordNote: z.string().trim().min(1).max(1000),
  units: z.array(z.object({
    id: z.string().optional(),
    sequence: z.number().int().positive(),
    kind: z.enum(["question", "answer", "image", "pause", "note", "section"]),
    speakerRole: z.enum(["interviewer", "participant", "recorder", "system"]),
    body: z.string().max(8000),
    occurredAt: z.iso.datetime({ offset: true }).nullable(),
    durationSeconds: z.number().int().nonnegative().nullable(),
    parentUnitId: z.string().nullable(),
  })).min(1).max(500),
  topics: z.array(z.object({ slug, name: z.string().trim().min(1).max(40) })).max(12),
  source: z.object({
    sourceType: z.enum(["douyin", "social_media", "in_person", "direct", "other"]),
    platformName: z.string().trim().max(80).optional(),
    externalId: z.string().max(120).optional(),
    canonicalUrl: webUrl.optional(),
  }),
});
const correctionSchema = z.object({
  recordNumber: z.string().regex(/^BH-\d{6}$/).optional(),
  requesterContact: z.string().trim().min(3).max(200),
  requesterRole: z.enum(["participant", "reader", "representative", "other"]),
  kind: z.enum(["fact", "identity", "privacy", "consent", "supplement", "topic", "withdrawal"]),
  description: z.string().trim().min(10).max(4000),
});

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
  if (url.pathname.startsWith("/api/v1/topics/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await repository.byTopic(segment(url.pathname, "/api/v1/topics/") ?? "") });
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

async function accountRecordRoute(request: Request, url: URL, records: RecordManagementModule, account: Awaited<ReturnType<AccountModule["resolve"]>>): Promise<Response> {
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
  const account = await accounts.resolve(await requireIdentity(request, env));
  const records = new RecordManagementModule(env.DB);

  if (url.pathname === "/api/account/me") {
    if (request.method === "GET") return json({ data: account });
    if (request.method === "PATCH") {
      const body = await parseBody(request, z.object({ displayName: z.string().trim().min(1).max(80) }));
      return json({ data: await accounts.updateProfile(account, body.displayName) });
    }
    return methodNotAllowed(["GET", "PATCH"]);
  }
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
  if (url.pathname === "/api/health") return json({ status: "ok", service: "project-been-here" });
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
