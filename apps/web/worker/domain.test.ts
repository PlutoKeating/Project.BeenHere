import { describe, expect, it } from "vitest";
import { deriveRecordPresentation, formatRecordNumber, normalizeExclusions } from "./domain";

describe("record numbering", () => {
  it("formats a stable six-digit public number", () => {
    expect(formatRecordNumber(821)).toBe("BH-000821");
  });

  it("rejects values outside the public number range", () => {
    expect(() => formatRecordNumber(0)).toThrow(RangeError);
    expect(() => formatRecordNumber(1_000_000)).toThrow(RangeError);
  });
});

describe("drift exclusions", () => {
  it("normalizes and de-duplicates recent record numbers", () => {
    expect(normalizeExclusions(["bh-000001", "bad", " BH-000002 ", "BH-000001"])).toEqual(["BH-000001", "BH-000002"]);
  });
});

describe("text interview presentation", () => {
  it("derives the title and excerpt from the two-role messages", () => {
    expect(deriveRecordPresentation({
      participant: { displayName: "小林", identityMode: "pseudonym" },
      conductedAt: "2026-09-01T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: "你为什么来到这里？" },
        { speakerRole: "participant", body: "只是想换一种生活。" },
      ],
      source: { sourceType: "douyin", platformName: "抖音" },
    })).toEqual({ title: "你为什么来到这里？", excerpt: "只是想换一种生活。" });
  });

  it("keeps derived public text within storage limits", () => {
    const longQuestion = "问".repeat(200);
    const longAnswer = "答".repeat(400);
    const result = deriveRecordPresentation({
      participant: { displayName: "匿名", identityMode: "anonymous" },
      conductedAt: "2026-09-01T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: longQuestion },
        { speakerRole: "participant", body: longAnswer },
      ],
      source: { sourceType: "social_media" },
    });
    expect(result.title).toHaveLength(120);
    expect(result.excerpt).toHaveLength(300);
  });
});
