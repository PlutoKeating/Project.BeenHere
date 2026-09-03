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

function uploaderClaimDb() {
  const preparedSql: string[] = [];
  const prepare = vi.fn((sql: string) => {
    preparedSql.push(sql);
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => {
        if (sql.includes("FROM interview_records")) return { id: "record-1" };
        if (sql.includes("FROM claim_requests")) return { record_id: "record-1", claimant_account_id: member.id, status: "pending" };
        if (sql.includes("ownership_kind = 'claimed'")) return null;
        if (sql.includes("record_id = ? AND account_id = ?")) return { ok: 1 };
        return null;
      }),
    };
    return statement;
  });
  const db = { prepare, batch: vi.fn(async () => [{ meta: { changes: 1 } }]) } as unknown as D1Database;
  return { db, preparedSql };
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

  it("lets an existing uploader submit that they are the participant", async () => {
    const { db } = uploaderClaimDb();
    const records = new RecordManagementModule(db);

    await expect(records.submitClaim("record-1", "我是这次采访的被采访者本人。", member)).resolves.toMatchObject({ claimId: expect.any(String) });
  });

  it("upgrades an existing owner row when their participant claim is approved", async () => {
    const { db, preparedSql } = uploaderClaimDb();
    const records = new RecordManagementModule(db);

    await records.reviewClaim("claim-1", "approved", "核验通过", director);

    const ownershipWrite = preparedSql.find((sql) => sql.includes("INSERT INTO record_owners"));
    expect(ownershipWrite).toContain("ON CONFLICT(record_id, account_id) DO UPDATE");
    expect(ownershipWrite).toContain("ownership_kind = 'claimed'");
  });
});
