import { describe, expect, it, vi } from "vitest";
import { RecordRepository } from "./record-repository";

function repositoryDb(): D1Database {
  const prepare = vi.fn((sql: string) => {
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => {
        if (sql.includes("FROM interview_records r JOIN people")) return {
          id: "record-1", record_number: "BH-000001", title: "一段采访", excerpt: "回答。",
          conducted_at: "2026-09-01T00:00:00.000Z", display_name: "小林", person_slug: "person-1", identity_mode: "pseudonym",
        };
        if (sql.includes("FROM published_editions")) return {
          id: "edition-1", edition_number: 1, change_summary: "首次公开", published_at: "2026-09-02T00:00:00.000Z", content_hash: "hash",
        };
        if (sql.includes("ownership_kind = 'claimed'")) return { ok: 1 };
        return null;
      }),
      all: vi.fn(async () => ({ results: [{ id: "message-1", speaker_role: "participant", body: "回答。" }] })),
    };
    return statement;
  });
  return { prepare } as unknown as D1Database;
}

describe("public record claim state", () => {
  it("reports whether the participant has already claimed the record", async () => {
    const record = await new RecordRepository(repositoryDb()).find("BH-000001");
    expect(record.isClaimed).toBe(true);
  });
});
