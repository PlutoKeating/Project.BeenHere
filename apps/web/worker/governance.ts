import { HttpError } from "./http";

export interface CorrectionInput {
  recordNumber?: string;
  requesterContact: string;
  requesterRole: "participant" | "reader" | "representative" | "other";
  kind: "fact" | "identity" | "privacy" | "consent" | "supplement" | "topic" | "withdrawal";
  description: string;
}

export class GovernanceModule {
  constructor(private readonly db: D1Database) {}

  async submitCorrection(input: CorrectionInput, rateLimitId: string) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const limit = await this.db.prepare(`INSERT INTO public_request_limits (id, request_count, expires_at)
      VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET request_count = request_count + 1
      RETURNING request_count`).bind(rateLimitId, expiresAt).first<{ request_count: number }>();
    if ((limit?.request_count ?? 6) > 5) throw new HttpError(429, "correction_rate_limited", "提交次数过多，请稍后再试。\n");
    const record = input.recordNumber
      ? await this.db.prepare("SELECT id FROM interview_records WHERE record_number = ?").bind(input.recordNumber).first<{ id: string }>()
      : null;
    if (input.recordNumber && !record) throw new HttpError(404, "record_not_found", "没有找到对应采访记录。\n");

    const requestId = `correction-${crypto.randomUUID()}`;
    await this.db.prepare(`INSERT INTO correction_requests
      (id, record_id, requester_contact, requester_role, kind, description) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(requestId, record?.id ?? null, input.requesterContact, input.requesterRole, input.kind, input.description)
      .run();
    return { requestId, status: "submitted" };
  }
}
