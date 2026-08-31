import { z } from "zod";
import { ArchiveRepository } from "./archive-repository";
import { EditorialModule, PublicationModule } from "./editorial";
import { GovernanceModule } from "./governance";
import { errorResponse, HttpError, json, methodNotAllowed, parseBody, requireAdmin, routeId } from "./http";
import type { DraftSnapshot, Env } from "./types";

const identityMode = z.enum(["real_name", "pseudonym", "anonymous"]);
const messageKind = z.enum(["question", "answer", "image", "pause", "note", "section"]);
const speakerRole = z.enum(["interviewer", "participant", "editor", "system"]);
const slug = z.string().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字与连字符。");

const draftSchema: z.ZodType<DraftSnapshot> = z.object({
  person: z.object({
    existingPersonId: z.string().min(1).optional(),
    slug,
    displayName: z.string().trim().min(1).max(80),
    identityMode,
    bio: z.string().trim().max(500),
  }),
  interview: z.object({
    title: z.string().trim().min(1).max(120),
    excerpt: z.string().trim().min(1).max(300),
    conductedAt: z.iso.datetime({ offset: true }),
    endedAt: z.iso.datetime({ offset: true }).optional(),
  }),
  story: z.array(z.string().trim().min(1).max(4000)).min(1).max(100),
  editorialNote: z.string().trim().min(1).max(1000),
  units: z.array(z.object({
    id: z.string().optional(),
    sequence: z.number().int().positive(),
    kind: messageKind,
    speakerRole,
    body: z.string().max(8000),
    occurredAt: z.iso.datetime({ offset: true }).nullable(),
    durationSeconds: z.number().int().nonnegative().nullable(),
    parentUnitId: z.string().nullable(),
  })).min(1).max(500),
  topics: z.array(z.object({ slug, name: z.string().trim().min(1).max(40) })).max(12),
  source: z.object({
    platform: z.enum(["douyin", "direct", "other"]),
    externalId: z.string().max(120).optional(),
    canonicalUrl: z.url().optional(),
  }).optional(),
});

const correctionSchema = z.object({
  archiveNumber: z.string().regex(/^BH-\d{6}$/).optional(),
  requesterContact: z.string().trim().min(3).max(200),
  requesterRole: z.enum(["participant", "reader", "representative", "other"]),
  kind: z.enum(["fact", "identity", "privacy", "consent", "supplement", "topic", "withdrawal"]),
  description: z.string().trim().min(10).max(4000),
});

const consentSchema = z.object({
  scope: z.record(z.string(), z.boolean()),
  evidenceReference: z.string().trim().min(3).max(500),
  grantedAt: z.iso.datetime({ offset: true }),
  policyVersion: z.string().trim().min(1).max(30),
});

const publishSchema = z.object({ changeSummary: z.string().trim().min(2).max(500) });
const withdrawSchema = z.object({ reason: z.string().trim().min(5).max(1000) });

function noContent(): Response {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

async function publicApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  const repository = new ArchiveRepository(env.DB);

  if (url.pathname === "/api/v1/meta") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await repository.meta() });
  }
  if (url.pathname === "/api/v1/archives") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const limit = Number(url.searchParams.get("limit") ?? "24");
    return json({ data: await repository.list(Number.isFinite(limit) ? limit : 24, url.searchParams.get("cursor") ?? undefined) });
  }
  if (url.pathname.startsWith("/api/v1/archives/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const archiveNumber = routeId(url.pathname, "/api/v1/archives/");
    if (!archiveNumber) throw new HttpError(400, "archive_number_required", "缺少 Archive Number。\n");
    return json({ data: await repository.findByArchiveNumber(archiveNumber.toUpperCase()) });
  }
  if (url.pathname === "/api/v1/drift") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const exclusions = url.searchParams.getAll("exclude").flatMap((value) => value.split(",")).filter(Boolean);
    return json({ data: await repository.drift(exclusions) }, { headers: { "cache-control": "no-store" } });
  }
  if (url.pathname === "/api/v1/search") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ data: await repository.search(url.searchParams.get("q") ?? "") });
  }
  if (url.pathname.startsWith("/api/v1/people/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const personSlug = routeId(url.pathname, "/api/v1/people/");
    if (!personSlug) throw new HttpError(400, "person_slug_required", "缺少人物路径。\n");
    return json({ data: await repository.byPerson(personSlug) });
  }
  if (url.pathname.startsWith("/api/v1/topics/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const topicSlug = routeId(url.pathname, "/api/v1/topics/");
    if (!topicSlug) throw new HttpError(400, "topic_slug_required", "缺少话题路径。\n");
    return json({ data: await repository.byTopic(topicSlug) });
  }
  if (url.pathname.startsWith("/api/v1/years/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const year = routeId(url.pathname, "/api/v1/years/");
    if (!year || !/^\d{4}$/.test(year)) throw new HttpError(400, "invalid_year", "年份格式无效。\n");
    return json({ data: await repository.byYear(year) });
  }
  if (url.pathname === "/api/v1/correction-requests") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const body = await parseBody(request, correctionSchema);
    return json({ data: await new GovernanceModule(env.DB).submitCorrection(body) }, { status: 201 });
  }
  return null;
}

async function adminApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/admin/")) return null;
  const actor = await requireAdmin(request, env);
  const editorial = new EditorialModule(env.DB);
  const publication = new PublicationModule(env.DB);

  if (url.pathname === "/api/admin/interviews") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    return json({ data: await editorial.createDraft(await parseBody(request, draftSchema), actor) }, { status: 201 });
  }

  const interviewId = routeId(url.pathname, "/api/admin/interviews/");
  if (!interviewId) return null;
  const action = url.pathname.slice(`/api/admin/interviews/${encodeURIComponent(interviewId)}`.length);

  if (!action && request.method === "PATCH") {
    const body = await parseBody(request, z.object({ expectedRevision: z.number().int().positive(), snapshot: draftSchema }));
    return json({ data: await editorial.updateDraft(interviewId, body.snapshot, body.expectedRevision, actor) });
  }
  if (action === "/participant-review" && request.method === "POST") {
    return json({ data: await editorial.requestReview(interviewId, actor) });
  }
  if (action === "/approve" && request.method === "POST") {
    return json({ data: await editorial.approve(interviewId, await parseBody(request, consentSchema), actor) });
  }
  if (action === "/publish" && request.method === "POST") {
    const body = await parseBody(request, publishSchema);
    return json({ data: await publication.publish(interviewId, body.changeSummary, actor) }, { status: 201 });
  }
  if (action === "/withdraw" && request.method === "POST") {
    const body = await parseBody(request, withdrawSchema);
    return json({ data: await publication.withdraw(interviewId, body.reason, actor) });
  }
  return methodNotAllowed(["PATCH", "POST"]);
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return noContent();
  if (url.pathname === "/api/health") return json({ status: "ok", service: "project-been-here" });

  const publicResponse = await publicApi(request, env, url);
  if (publicResponse) return publicResponse;
  const adminResponse = await adminApi(request, env, url);
  if (adminResponse) return adminResponse;
  if (url.pathname.startsWith("/api/")) throw new HttpError(404, "route_not_found", "没有这个接口。\n");
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      return errorResponse(error);
    }
  },
} satisfies ExportedHandler<Env>;

export { handle };
