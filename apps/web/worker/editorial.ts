import { HttpError } from "./http";
import { assertEditorialTransition, formatArchiveNumber } from "./domain";
import type { DraftSnapshot } from "./types";

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function hash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class EditorialModule {
  constructor(private readonly db: D1Database) {}

  async createDraft(snapshot: DraftSnapshot, actor: string) {
    const personId = id("person");
    const interviewId = id("interview");
    const now = new Date().toISOString();
    const existingPerson = await this.db.prepare("SELECT id FROM people WHERE slug = ?").bind(snapshot.person.slug).first<{ id: string }>();
    const resolvedPersonId = existingPerson?.id ?? personId;

    const statements: D1PreparedStatement[] = [];
    if (!existingPerson) {
      statements.push(this.db.prepare(`INSERT INTO people (id, slug, display_name, identity_mode, bio, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(personId, snapshot.person.slug, snapshot.person.displayName, snapshot.person.identityMode, snapshot.person.bio, now, now));
    }
    statements.push(
      this.db.prepare(`INSERT INTO interviews
        (id, person_id, title, excerpt, conducted_at, ended_at, editorial_state, visibility, random_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'editorial_review', 'embargoed', ?, ?, ?)`)
        .bind(interviewId, resolvedPersonId, snapshot.interview.title, snapshot.interview.excerpt, snapshot.interview.conductedAt, snapshot.interview.endedAt ?? null, Math.random(), now, now),
      this.db.prepare(`INSERT INTO editorial_drafts (interview_id, revision, status, snapshot, updated_by, updated_at) VALUES (?, 1, 'editorial_review', ?, ?, ?)`)
        .bind(interviewId, JSON.stringify(snapshot), actor, now),
      this.db.prepare(`INSERT INTO audit_events (id, actor, action, target_type, target_id, reason, after_hash, created_at) VALUES (?, ?, 'draft.created', 'interview', ?, '创建采访草稿', ?, ?)`)
        .bind(id("audit"), actor, interviewId, await hash(JSON.stringify(snapshot)), now),
    );
    if (snapshot.source) {
      statements.push(this.db.prepare(`INSERT INTO source_records
        (id, interview_id, platform, external_id, canonical_url, captured_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(id("source"), interviewId, snapshot.source.platform, snapshot.source.externalId ?? null, snapshot.source.canonicalUrl ?? null, now));
    }
    await this.db.batch(statements);
    return { interviewId, revision: 1, status: "editorial_review" };
  }

  async updateDraft(interviewId: string, snapshot: DraftSnapshot, expectedRevision: number, actor: string) {
    const current = await this.db.prepare("SELECT revision, status, snapshot FROM editorial_drafts WHERE interview_id = ?").bind(interviewId).first<{ revision: number; status: string; snapshot: string }>();
    if (!current) throw new HttpError(404, "draft_not_found", "没有找到采访草稿。\n");
    if (current.status !== "editorial_review") throw new HttpError(409, "draft_locked", "草稿已进入确认流程，不能直接编辑。\n");
    if (current.revision !== expectedRevision) throw new HttpError(409, "revision_conflict", "草稿已被其他编辑者更新，请重新载入。\n");

    const nextRevision = current.revision + 1;
    const now = new Date().toISOString();
    const beforeHash = await hash(current.snapshot);
    const afterHash = await hash(JSON.stringify(snapshot));
    await this.db.batch([
      this.db.prepare(`UPDATE editorial_drafts SET revision = ?, snapshot = ?, updated_by = ?, updated_at = ? WHERE interview_id = ? AND revision = ?`)
        .bind(nextRevision, JSON.stringify(snapshot), actor, now, interviewId, expectedRevision),
      this.db.prepare(`UPDATE interviews SET title = ?, excerpt = ?, conducted_at = ?, ended_at = ?, updated_at = ? WHERE id = ?`)
        .bind(snapshot.interview.title, snapshot.interview.excerpt, snapshot.interview.conductedAt, snapshot.interview.endedAt ?? null, now, interviewId),
      this.db.prepare(`INSERT INTO audit_events (id, actor, action, target_type, target_id, reason, before_hash, after_hash, created_at) VALUES (?, ?, 'draft.updated', 'interview', ?, '更新采访草稿', ?, ?, ?)`)
        .bind(id("audit"), actor, interviewId, beforeHash, afterHash, now),
    ]);
    return { interviewId, revision: nextRevision, status: current.status };
  }

  async requestReview(interviewId: string, actor: string) {
    const draft = await this.db.prepare("SELECT status, snapshot FROM editorial_drafts WHERE interview_id = ?").bind(interviewId).first<{ status: string; snapshot: string }>();
    if (!draft) throw new HttpError(404, "draft_not_found", "没有找到采访草稿。\n");
    if (draft.status !== "editorial_review") throw new HttpError(409, "invalid_editorial_state", "只有编辑审核中的草稿可以发起确认。\n");
    assertEditorialTransition("editorial_review", "participant_review");
    const reviewHash = await hash(draft.snapshot);
    const now = new Date().toISOString();
    await this.db.batch([
      this.db.prepare("UPDATE editorial_drafts SET status = 'participant_review', review_hash = ?, updated_by = ?, updated_at = ? WHERE interview_id = ?")
        .bind(reviewHash, actor, now, interviewId),
      this.db.prepare("UPDATE interviews SET editorial_state = 'participant_review', updated_at = ? WHERE id = ?").bind(now, interviewId),
      this.db.prepare(`INSERT INTO audit_events (id, actor, action, target_type, target_id, reason, after_hash, created_at) VALUES (?, ?, 'review.requested', 'interview', ?, '发起受访者确认', ?, ?)`)
        .bind(id("audit"), actor, interviewId, reviewHash, now),
    ]);
    return { interviewId, status: "participant_review", reviewHash };
  }

  async approve(interviewId: string, consent: { scope: Record<string, boolean>; evidenceReference: string; grantedAt: string; policyVersion: string }, actor: string) {
    const draft = await this.db.prepare("SELECT status, snapshot, review_hash FROM editorial_drafts WHERE interview_id = ?").bind(interviewId).first<{ status: string; snapshot: string; review_hash: string }>();
    if (!draft) throw new HttpError(404, "draft_not_found", "没有找到采访草稿。\n");
    if (draft.status !== "participant_review") throw new HttpError(409, "invalid_editorial_state", "草稿尚未进入受访者确认。\n");
    assertEditorialTransition("participant_review", "approved");
    if ((await hash(draft.snapshot)) !== draft.review_hash) throw new HttpError(409, "review_snapshot_changed", "待确认内容已经变化，必须重新发起确认。\n");
    const interview = await this.db.prepare("SELECT person_id FROM interviews WHERE id = ?").bind(interviewId).first<{ person_id: string }>();
    if (!interview) throw new HttpError(404, "interview_not_found", "没有找到采访。\n");
    const consentId = id("consent");
    const now = new Date().toISOString();
    await this.db.batch([
      this.db.prepare(`INSERT INTO consent_grants (id, person_id, interview_id, scope, evidence_reference, granted_at, policy_version) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(consentId, interview.person_id, interviewId, JSON.stringify(consent.scope), consent.evidenceReference, consent.grantedAt, consent.policyVersion),
      this.db.prepare("UPDATE editorial_drafts SET status = 'approved', updated_by = ?, updated_at = ? WHERE interview_id = ?").bind(actor, now, interviewId),
      this.db.prepare("UPDATE interviews SET editorial_state = 'approved', updated_at = ? WHERE id = ?").bind(now, interviewId),
      this.db.prepare(`INSERT INTO audit_events (id, actor, action, target_type, target_id, reason, after_hash, created_at) VALUES (?, ?, 'interview.approved', 'interview', ?, '记录授权并批准出版', ?, ?)`)
        .bind(id("audit"), actor, interviewId, draft.review_hash, now),
    ]);
    return { interviewId, consentId, status: "approved" };
  }
}

export class PublicationModule {
  constructor(private readonly db: D1Database) {}

  async publish(interviewId: string, changeSummary: string, actor: string) {
    const draft = await this.db.prepare("SELECT status, snapshot FROM editorial_drafts WHERE interview_id = ?").bind(interviewId).first<{ status: string; snapshot: string }>();
    if (!draft) throw new HttpError(404, "draft_not_found", "没有找到采访草稿。\n");
    if (draft.status !== "approved") throw new HttpError(409, "not_approved", "采访必须先完成受访者确认与审核。\n");
    const interview = await this.db.prepare("SELECT archive_number, current_edition_id FROM interviews WHERE id = ?").bind(interviewId).first<{ archive_number: string | null; current_edition_id: string | null }>();
    if (!interview) throw new HttpError(404, "interview_not_found", "没有找到采访。\n");
    const consent = await this.db.prepare("SELECT id FROM consent_grants WHERE interview_id = ? AND revoked_at IS NULL ORDER BY granted_at DESC LIMIT 1").bind(interviewId).first<{ id: string }>();
    if (!consent) throw new HttpError(409, "consent_missing", "没有有效 Consent Grant。\n");

    let archiveNumber = interview.archive_number;
    if (!archiveNumber) {
      const allocation = await this.db.prepare("INSERT INTO archive_sequences DEFAULT VALUES").run();
      archiveNumber = formatArchiveNumber(Number(allocation.meta.last_row_id));
    }
    const previous = interview.current_edition_id
      ? await this.db.prepare("SELECT edition_number FROM published_editions WHERE id = ?").bind(interview.current_edition_id).first<{ edition_number: number }>()
      : null;
    const editionNumber = (previous?.edition_number ?? 0) + 1;
    const editionId = id("edition");
    const now = new Date().toISOString();
    const contentHash = await hash(draft.snapshot);
    const snapshot = JSON.parse(draft.snapshot) as DraftSnapshot;
    const statements: D1PreparedStatement[] = [
      this.db.prepare(`INSERT INTO published_editions
        (id, interview_id, edition_number, snapshot, change_summary, approved_by, published_by, consent_grant_id, published_at, supersedes_id, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(editionId, interviewId, editionNumber, JSON.stringify({ story: snapshot.story, editorialNote: snapshot.editorialNote }), changeSummary, actor, actor, consent.id, now, interview.current_edition_id, contentHash),
      this.db.prepare(`UPDATE interviews SET archive_number = ?, current_edition_id = ?, editorial_state = 'published', visibility = 'public', updated_at = ? WHERE id = ?`)
        .bind(archiveNumber, editionId, now, interviewId),
      this.db.prepare(`INSERT INTO audit_events (id, actor, action, target_type, target_id, reason, after_hash, created_at) VALUES (?, ?, 'edition.published', 'interview', ?, ?, ?, ?)`)
        .bind(id("audit"), actor, interviewId, changeSummary, contentHash, now),
    ];
    for (const [index, unit] of snapshot.units.entries()) {
      statements.push(this.db.prepare(`INSERT INTO message_units
        (id, interview_id, edition_id, sequence, kind, speaker_role, body, occurred_at, duration_seconds, parent_unit_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(unit.id ?? id("unit"), interviewId, editionId, index + 1, unit.kind, unit.speakerRole, unit.body, unit.occurredAt, unit.durationSeconds, unit.parentUnitId));
    }
    for (const topic of snapshot.topics) {
      const topicId = `topic-${topic.slug}`;
      statements.push(
        this.db.prepare("INSERT OR IGNORE INTO topics (id, slug, name) VALUES (?, ?, ?)").bind(topicId, topic.slug, topic.name),
        this.db.prepare("INSERT OR IGNORE INTO interview_topics (interview_id, topic_id) VALUES (?, ?)").bind(interviewId, topicId),
      );
    }
    await this.db.batch(statements);
    return { interviewId, archiveNumber, editionNumber, publishedAt: now };
  }

  async withdraw(interviewId: string, reason: string, actor: string) {
    const interview = await this.db.prepare("SELECT visibility, current_edition_id FROM interviews WHERE id = ?").bind(interviewId).first<{ visibility: string; current_edition_id: string | null }>();
    if (!interview) throw new HttpError(404, "interview_not_found", "没有找到采访。\n");
    if (interview.visibility === "withdrawn") return { interviewId, status: "withdrawn" };
    const now = new Date().toISOString();
    await this.db.batch([
      this.db.prepare("UPDATE interviews SET visibility = 'withdrawn', editorial_state = 'withdrawn', updated_at = ? WHERE id = ?").bind(now, interviewId),
      this.db.prepare(`INSERT INTO audit_events (id, actor, action, target_type, target_id, reason, before_hash, created_at) VALUES (?, ?, 'interview.withdrawn', 'interview', ?, ?, ?, ?)`)
        .bind(id("audit"), actor, interviewId, reason, interview.current_edition_id, now),
    ]);
    return { interviewId, status: "withdrawn", withdrawnAt: now };
  }
}
