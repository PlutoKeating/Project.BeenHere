import { automatedInterviewUpdateError, deriveRecordPresentation, formatRecordNumber, ownershipKindForDraft } from "./domain";
import { HttpError } from "./http";
import type { Account, RecordDraft } from "./types";

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function digest(value: string): Promise<string> {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(data)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class RecordManagementModule {
  constructor(private readonly db: D1Database) {}

  private async isClaimed(recordId: string): Promise<boolean> {
    return Boolean(await this.db.prepare("SELECT 1 AS ok FROM record_owners WHERE record_id = ? AND ownership_kind = 'claimed' LIMIT 1").bind(recordId).first());
  }

  private async assertManage(recordId: string, account: Account): Promise<void> {
    if (account.role === "director") return;
    const owner = await this.db.prepare("SELECT 1 AS ok FROM record_owners WHERE record_id = ? AND account_id = ?").bind(recordId, account.id).first();
    if (!owner) throw new HttpError(403, "record_owner_required", "只有记录主人或馆长可以执行此操作。\n");
  }

  private audit(account: Account, action: string, targetId: string, reason: string): D1PreparedStatement {
    return this.db.prepare(`INSERT INTO audit_events
      (id, actor_account_id, actor_label, action, target_type, target_id, reason, created_at)
      VALUES (?, ?, ?, ?, 'interview_record', ?, ?, ?)`).bind(uid("audit"), account.id, account.email, action, targetId, reason, new Date().toISOString());
  }

  async create(draft: RecordDraft, account: Account) {
    const personId = uid("person");
    const recordId = uid("record");
    const now = new Date().toISOString();
    const presentation = deriveRecordPresentation(draft);
    const ownershipKind = ownershipKindForDraft(draft);
    await this.db.batch([
      this.db.prepare("INSERT INTO people (id, slug, display_name, identity_mode, bio, created_at, updated_at) VALUES (?, ?, ?, ?, '', ?, ?)").bind(personId, personId, draft.participant.displayName, draft.participant.identityMode, now, now),
      this.db.prepare("INSERT INTO interview_records (id, person_id, title, excerpt, conducted_at, random_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(recordId, personId, presentation.title, presentation.excerpt, draft.conductedAt, Math.random(), now, now),
      this.db.prepare("INSERT INTO record_owners (record_id, account_id, ownership_kind, granted_by, created_at) VALUES (?, ?, ?, ?, ?)").bind(recordId, account.id, ownershipKind, account.id, now),
      this.db.prepare("INSERT INTO record_drafts (record_id, revision, snapshot, updated_by, updated_at) VALUES (?, 1, ?, ?, ?)").bind(recordId, JSON.stringify(draft), account.id, now),
      this.db.prepare("INSERT INTO source_records (id, record_id, source_type, platform_name, canonical_url, captured_at) VALUES (?, ?, ?, ?, ?, ?)").bind(uid("source"), recordId, draft.source.sourceType, draft.source.platformName ?? null, draft.source.canonicalUrl ?? null, now),
      this.audit(account, "record.created", recordId, ownershipKind === "claimed" ? "创建本人自动采访记录" : "创建采访记录"),
    ]);
    return { recordId, revision: 1 };
  }

  async mine(account: Account) {
    const base = `SELECT r.id, r.record_number, r.title,
      r.visibility, d.updated_at, d.revision
      FROM interview_records r JOIN record_drafts d ON d.record_id = r.id`;
    const statement = account.role === "director"
      ? this.db.prepare(`${base} ORDER BY r.updated_at DESC`)
      : this.db.prepare(`${base} WHERE EXISTS (
          SELECT 1 FROM record_owners ro WHERE ro.record_id = r.id AND ro.account_id = ?
        ) ORDER BY r.updated_at DESC`).bind(account.id);
    return (await statement.all()).results;
  }

  async editable(recordId: string, account: Account) {
    await this.assertManage(recordId, account);
    const row = await this.db.prepare(`SELECT r.id, r.record_number, r.visibility, d.revision, d.snapshot
      FROM interview_records r JOIN record_drafts d ON d.record_id = r.id WHERE r.id = ?`).bind(recordId).first();
    if (!row) throw new HttpError(404, "record_not_found", "没有找到这条采访记录。\n");
    return row;
  }

  async update(recordId: string, draft: RecordDraft, expectedRevision: number, account: Account) {
    await this.assertManage(recordId, account);
    const current = await this.db.prepare("SELECT revision, snapshot FROM record_drafts WHERE record_id = ?").bind(recordId).first<{ revision: number; snapshot: string }>();
    if (!current) throw new HttpError(404, "record_not_found", "没有找到这条采访记录。\n");
    if (current.revision !== expectedRevision) throw new HttpError(409, "revision_conflict", "内容已被其他记录主人修改，请重新载入。\n");
    const immutableError = automatedInterviewUpdateError(JSON.parse(current.snapshot) as RecordDraft, draft);
    if (immutableError) throw new HttpError(400, "automated_interview_immutable", `${immutableError}\n`);
    const nextRevision = expectedRevision + 1;
    const now = new Date().toISOString();
    const presentation = deriveRecordPresentation(draft);
    const results = await this.db.batch([
      this.db.prepare("UPDATE record_drafts SET revision = ?, snapshot = ?, updated_by = ?, updated_at = ? WHERE record_id = ? AND revision = ?").bind(nextRevision, JSON.stringify(draft), account.id, now, recordId, expectedRevision),
      this.db.prepare("UPDATE interview_records SET title = CASE WHEN visibility = 'private' THEN ? ELSE title END, excerpt = ?, conducted_at = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM record_drafts WHERE record_id = ? AND revision = ?)").bind(presentation.title, presentation.excerpt, draft.conductedAt, now, recordId, recordId, nextRevision),
      this.db.prepare("UPDATE people SET display_name = ?, identity_mode = ?, updated_at = ? WHERE id = (SELECT person_id FROM interview_records WHERE id = ?) AND EXISTS (SELECT 1 FROM record_drafts WHERE record_id = ? AND revision = ?)").bind(draft.participant.displayName, draft.participant.identityMode, now, recordId, recordId, nextRevision),
      this.db.prepare("UPDATE source_records SET source_type = ?, platform_name = ?, canonical_url = ? WHERE record_id = ? AND EXISTS (SELECT 1 FROM record_drafts WHERE record_id = ? AND revision = ?)").bind(draft.source.sourceType, draft.source.platformName ?? null, draft.source.canonicalUrl ?? null, recordId, recordId, nextRevision),
      this.db.prepare(`INSERT INTO audit_events (id, actor_account_id, actor_label, action, target_type, target_id, reason, created_at)
        SELECT ?, ?, ?, 'record.updated', 'interview_record', ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM record_drafts WHERE record_id = ? AND revision = ?)`).bind(uid("audit"), account.id, account.email, recordId, `保存修订 ${nextRevision}`, now, recordId, nextRevision),
    ]);
    if (!results[0]?.meta.changes) throw new HttpError(409, "revision_conflict", "内容已被其他记录主人修改，请重新载入。\n");
    return { recordId, revision: nextRevision };
  }

  async publish(recordId: string, summary: string, account: Account) {
    await this.assertManage(recordId, account);
    const row = await this.db.prepare(`SELECT r.record_number, r.current_edition_id, d.snapshot
      FROM interview_records r JOIN record_drafts d ON d.record_id = r.id
      WHERE r.id = ? AND r.visibility != 'deleted'`).bind(recordId).first<{ record_number: string | null; current_edition_id: string | null; snapshot: string }>();
    if (!row) throw new HttpError(404, "record_not_found", "没有找到这条采访记录。\n");

    let recordNumber = row.record_number;
    if (!recordNumber) {
      const sequence = await this.db.prepare("INSERT INTO record_sequences DEFAULT VALUES").run();
      recordNumber = formatRecordNumber(Number(sequence.meta.last_row_id));
    }
    const previous = row.current_edition_id
      ? await this.db.prepare("SELECT edition_number FROM published_editions WHERE id = ?").bind(row.current_edition_id).first<{ edition_number: number }>()
      : null;
    const editionId = uid("edition");
    const edition = (previous?.edition_number ?? 0) + 1;
    const now = new Date().toISOString();
    const contentHash = await digest(row.snapshot);
    const draft = JSON.parse(row.snapshot) as RecordDraft;
    const presentation = deriveRecordPresentation(draft);
    const statements: D1PreparedStatement[] = [
      this.db.prepare("INSERT INTO published_editions (id, record_id, edition_number, snapshot, change_summary, published_by, published_at, supersedes_id, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(editionId, recordId, edition, row.snapshot, summary, account.id, now, row.current_edition_id, contentHash),
      this.db.prepare("UPDATE interview_records SET record_number = ?, current_edition_id = ?, title = ?, excerpt = ?, conducted_at = ?, ended_at = NULL, visibility = 'public', updated_at = ? WHERE id = ?").bind(recordNumber, editionId, presentation.title, presentation.excerpt, draft.conductedAt, now, recordId),
      this.db.prepare("UPDATE people SET display_name = ?, identity_mode = ?, bio = '', updated_at = ? WHERE id = (SELECT person_id FROM interview_records WHERE id = ?)").bind(draft.participant.displayName, draft.participant.identityMode, now, recordId),
    ];
    draft.messages.forEach((message, index) => statements.push(this.db.prepare("INSERT INTO interview_messages (id, record_id, edition_id, sequence, speaker_role, body) VALUES (?, ?, ?, ?, ?, ?)").bind(uid("message"), recordId, editionId, index + 1, message.speakerRole, message.body)));
    statements.push(this.audit(account, "record.published", recordId, summary));
    await this.db.batch(statements);
    return { recordId, recordNumber, edition };
  }

  async remove(recordId: string, reason: string, account: Account): Promise<void> {
    await this.assertManage(recordId, account);
    const now = new Date().toISOString();
    const results = await this.db.batch([
      this.db.prepare("UPDATE interview_records SET visibility = 'deleted', deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = ? AND visibility != 'deleted'").bind(now, account.id, now, recordId),
      this.db.prepare(`INSERT INTO audit_events (id, actor_account_id, actor_label, action, target_type, target_id, reason, created_at)
        SELECT ?, ?, ?, 'record.deleted', 'interview_record', ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM interview_records WHERE id = ? AND deleted_at = ? AND deleted_by = ?)`).bind(uid("audit"), account.id, account.email, recordId, reason, now, recordId, now, account.id),
    ]);
    if (!results[0]?.meta.changes) throw new HttpError(404, "record_not_found", "没有找到可删除的采访记录。\n");
  }

  async submitClaim(recordId: string, requestText: string, account: Account) {
    const record = await this.db.prepare("SELECT id FROM interview_records WHERE id = ? AND visibility != 'deleted'").bind(recordId).first();
    if (!record) throw new HttpError(404, "record_not_found", "没有找到这条采访记录。\n");
    if (await this.isClaimed(recordId)) throw new HttpError(409, "already_claimed", "这条采访记录已经由被采访者认领。\n");
    const claimId = uid("claim");
    try {
      const results = await this.db.batch([
        this.db.prepare(`INSERT INTO claim_requests (id, record_id, claimant_account_id, request_text)
          SELECT ?, ?, ?, ? WHERE NOT EXISTS (
            SELECT 1 FROM record_owners WHERE record_id = ? AND ownership_kind = 'claimed'
          )`).bind(claimId, recordId, account.id, requestText, recordId),
        this.db.prepare(`INSERT INTO audit_events
          (id, actor_account_id, actor_label, action, target_type, target_id, reason, created_at)
          SELECT ?, ?, ?, 'claim.submitted', 'interview_record', ?, '提交本人认领申请', ?
          FROM claim_requests WHERE id = ? AND status = 'pending'`).bind(uid("audit"), account.id, account.email, recordId, new Date().toISOString(), claimId),
      ]);
      if (!results[0]?.meta.changes) throw new HttpError(409, "already_claimed", "这条采访记录已经由被采访者认领。\n");
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (await this.isClaimed(recordId)) throw new HttpError(409, "already_claimed", "这条采访记录已经由被采访者认领。\n");
      throw new HttpError(409, "claim_pending", "你已经提交过待处理的认领申请。\n");
    }
    return { claimId };
  }

  async claims(account: Account) {
    const receivedBase = `SELECT c.id, c.record_id, c.request_text, c.status, c.created_at,
      a.display_name AS claimant_name, r.title FROM claim_requests c
      JOIN accounts a ON a.id = c.claimant_account_id JOIN interview_records r ON r.id = c.record_id`;
    const received = account.role === "director"
      ? (await this.db.prepare(`${receivedBase} ORDER BY c.created_at DESC`).all()).results
      : (await this.db.prepare(`${receivedBase} WHERE EXISTS (
          SELECT 1 FROM record_owners ro WHERE ro.record_id = c.record_id AND ro.account_id = ?
        ) ORDER BY c.created_at DESC`).bind(account.id).all()).results;
    const sent = (await this.db.prepare(`SELECT c.id, c.record_id, c.request_text, c.status, c.created_at, r.title
      FROM claim_requests c JOIN interview_records r ON r.id = c.record_id
      WHERE c.claimant_account_id = ? ORDER BY c.created_at DESC`).bind(account.id).all()).results;
    return { received, sent };
  }

  async reviewClaim(claimId: string, decision: "approved" | "rejected", note: string, account: Account): Promise<void> {
    const claim = await this.db.prepare("SELECT record_id, claimant_account_id, status FROM claim_requests WHERE id = ?").bind(claimId).first<{ record_id: string; claimant_account_id: string; status: string }>();
    if (!claim) throw new HttpError(404, "claim_not_found", "没有找到认领申请。\n");
    await this.assertManage(claim.record_id, account);
    if (claim.status !== "pending") throw new HttpError(409, "claim_resolved", "该申请已经处理。\n");
    if (decision === "approved" && await this.isClaimed(claim.record_id)) throw new HttpError(409, "already_claimed", "这条采访记录已经由被采访者认领。\n");
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [
      this.db.prepare("UPDATE claim_requests SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'").bind(decision, account.id, note, now, claimId),
      this.db.prepare(`INSERT INTO audit_events (id, actor_account_id, actor_label, action, target_type, target_id, reason, created_at)
        SELECT ?, ?, ?, ?, 'interview_record', ?, ?, ? FROM claim_requests
        WHERE id = ? AND reviewed_at = ? AND reviewed_by = ?`).bind(uid("audit"), account.id, account.email, `claim.${decision}`, claim.record_id, note || (decision === "approved" ? "同意认领" : "拒绝认领"), now, claimId, now, account.id),
    ];
    if (decision === "approved") statements.push(this.db.prepare(`INSERT INTO record_owners (record_id, account_id, ownership_kind, granted_by, created_at)
      SELECT record_id, claimant_account_id, 'claimed', ?, ? FROM claim_requests
      WHERE id = ? AND reviewed_at = ? AND reviewed_by = ? AND status = 'approved'
      ON CONFLICT(record_id, account_id) DO UPDATE SET
        ownership_kind = 'claimed', granted_by = excluded.granted_by, created_at = excluded.created_at
      WHERE record_owners.ownership_kind != 'claimed'`).bind(account.id, now, claimId, now, account.id));
    if (decision === "approved") statements.push(this.db.prepare(`UPDATE claim_requests
      SET status = 'cancelled', reviewed_by = ?, review_note = '该采访记录已由被采访者认领。', reviewed_at = ?
      WHERE record_id = ? AND id != ? AND status = 'pending'
      AND EXISTS (SELECT 1 FROM claim_requests current
        WHERE current.id = ? AND current.reviewed_at = ? AND current.reviewed_by = ? AND current.status = 'approved')
    `).bind(account.id, now, claim.record_id, claimId, claimId, now, account.id));
    let results: D1Result[];
    try {
      results = await this.db.batch(statements);
    } catch (error) {
      if (decision === "approved" && await this.isClaimed(claim.record_id)) throw new HttpError(409, "already_claimed", "这条采访记录已经由被采访者认领。\n");
      throw error;
    }
    if (!results[0]?.meta.changes) throw new HttpError(409, "claim_resolved", "该申请已经被其他记录主人处理。\n");
  }
}
