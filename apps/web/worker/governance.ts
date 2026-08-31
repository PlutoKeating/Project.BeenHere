import { HttpError } from "./http";

export interface CorrectionInput {
  archiveNumber?: string;
  requesterContact: string;
  requesterRole: "participant" | "reader" | "representative" | "other";
  kind: "fact" | "identity" | "privacy" | "consent" | "supplement" | "topic" | "withdrawal";
  description: string;
}

export class GovernanceModule {
  constructor(private readonly db: D1Database) {}

  async submitCorrection(input: CorrectionInput) {
    const interview = input.archiveNumber
      ? await this.db.prepare("SELECT id FROM interviews WHERE archive_number = ?").bind(input.archiveNumber).first<{ id: string }>()
      : null;
    if (input.archiveNumber && !interview) throw new HttpError(404, "archive_not_found", "没有找到对应档案。\n");

    const requestId = `correction-${crypto.randomUUID()}`;
    await this.db.prepare(`INSERT INTO correction_requests
      (id, interview_id, requester_contact, requester_role, kind, description) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(requestId, interview?.id ?? null, input.requesterContact, input.requesterRole, input.kind, input.description)
      .run();
    return { requestId, status: "submitted" };
  }
}
