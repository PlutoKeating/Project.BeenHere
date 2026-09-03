import { describe, expect, it, vi } from "vitest";
import { RecordManagementModule } from "./record-management";
import type { Account } from "./types";

const member: Account = { id: "account-2", email: "member@example.test", displayName: "成员", role: "member", status: "active" };
const director: Account = { ...member, id: "director-1", role: "director" };

function claimedRecordDb(): D1Database {
  const prepare = vi.fn((sql: string) => {
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => {
        if (sql.includes("FROM interview_records")) return { id: "record-1" };
        if (sql.includes("FROM claim_requests")) return { record_id: "record-1", claimant_account_id: member.id, status: "pending" };
        if (sql.includes("ownership_kind = 'claimed'")) return { ok: 1 };
        return null;
      }),
    };
    return statement;
  });
  return { prepare, batch: vi.fn(async () => [{ meta: { changes: 1 } }]) } as unknown as D1Database;
}

describe("record claim exclusivity", () => {
  it("rejects a new claim when the participant has already claimed the record", async () => {
    const records = new RecordManagementModule(claimedRecordDb());
    await expect(records.submitClaim("record-1", "我是这次采访的被采访者。", member)).rejects.toMatchObject({ status: 409, code: "already_claimed" });
  });

  it("cannot approve a pending claim after another claim has been approved", async () => {
    const records = new RecordManagementModule(claimedRecordDb());
    await expect(records.reviewClaim("claim-2", "approved", "", director)).rejects.toMatchObject({ status: 409, code: "already_claimed" });
  });
});
