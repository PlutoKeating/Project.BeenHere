import { describe, expect, it } from "vitest";
import { draftSchema } from "./index";

const validDraft = {
  participant: { displayName: "小林", identityMode: "pseudonym" },
  conductedAt: "2026-09-01T00:00:00.000Z",
  messages: [
    { speakerRole: "interviewer", body: "你最近在想什么？" },
    { speakerRole: "participant", body: "想去看看海。" },
  ],
  source: { sourceType: "douyin", platformName: "抖音" },
};

describe("text interview draft schema", () => {
  it("accepts a two-role plain-text interview", () => {
    expect(draftSchema.safeParse(validDraft).success).toBe(true);
  });

  it("rejects third-party message roles", () => {
    const result = draftSchema.safeParse({ ...validDraft, messages: [{ speakerRole: "system", body: "joined" }, ...validDraft.messages] });
    expect(result.success).toBe(false);
  });

  it("requires at least one message from each role", () => {
    const result = draftSchema.safeParse({ ...validDraft, messages: validDraft.messages.map((message) => ({ ...message, speakerRole: "interviewer" })) });
    expect(result.success).toBe(false);
  });
});
