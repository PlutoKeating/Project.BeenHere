import { describe, expect, it } from "vitest";
import { automatedInterviewUpdateError, deriveRecordPresentation, formatRecordNumber, normalizeExclusions, ownershipKindForDraft } from "./domain";
import type { RecordDraft } from "./types";

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
    })).toEqual({ title: "只是想换一种生活", excerpt: "只是想换一种生活。" });
  });

  it("keeps derived public text within storage limits", () => {
    const longQuestion = "问".repeat(200);
    const longAnswer = "这是一个很长的回答".repeat(50);
    const result = deriveRecordPresentation({
      participant: { displayName: "匿名", identityMode: "anonymous" },
      conductedAt: "2026-09-01T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: longQuestion },
        { speakerRole: "participant", body: longAnswer },
      ],
      source: { sourceType: "social_media" },
    });
    expect(result.title).toHaveLength(48);
    expect(result.excerpt).toHaveLength(300);
  });

  it("summarizes the recurring theme across all participant messages", () => {
    const result = deriveRecordPresentation({
      participant: { displayName: "小林", identityMode: "pseudonym" },
      conductedAt: "2026-09-02T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: "你好，我是自动采访程序。" },
        { speakerRole: "participant", body: "还行，忙得要命，但是很开心。" },
        { speakerRole: "participant", body: "我们会一起创造伟大的事业。" },
        { speakerRole: "participant", body: "虽然路上很久，我真的要创造伟大的事业！" },
      ],
      source: { sourceType: "direct", platformName: "来过 · 自动采访" },
    });

    expect(result.title).toBe("一起创造伟大的事业");
    expect(result.title).not.toContain("自动采访程序");
  });

  it("falls back to a neutral title for low-information utterances", () => {
    const result = deriveRecordPresentation({
      participant: { displayName: "小林", identityMode: "pseudonym" },
      conductedAt: "2026-09-02T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: "我们开始吧。" },
        { speakerRole: "participant", body: "咳咳" },
      ],
      source: { sourceType: "direct" },
    });
    expect(result.title).toBe("与小林的一次采访");
  });

  it("uses ranked theme cues instead of an unrelated closing phrase", () => {
    const result = deriveRecordPresentation({
      participant: { displayName: "小林", identityMode: "pseudonym" },
      conductedAt: "2026-09-02T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: "最近在做什么？" },
        { speakerRole: "participant", body: "我喜欢音乐，也一直在学吉他。" },
        { speakerRole: "participant", body: "最后说声再见。" },
      ],
      source: { sourceType: "direct" },
    });
    expect(result.title).toBe("喜欢音乐");
  });

  it("samples the middle of long answers and supports Latin key phrases", () => {
    const result = deriveRecordPresentation({
      participant: { displayName: "Lin", identityMode: "pseudonym" },
      conductedAt: "2026-09-02T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: "What matters to you?" },
        { speakerRole: "participant", body: "one. two. three. four. Community gardens bring us together. six. seven. eight. nine. ten." },
        { speakerRole: "participant", body: "I keep returning to community gardens." },
        { speakerRole: "participant", body: "That is all for today." },
      ],
      source: { sourceType: "direct" },
    });
    expect(result.title.toLowerCase()).toContain("community gardens");
  });

  it("treats routine acknowledgements as low-information", () => {
    const result = deriveRecordPresentation({
      participant: { displayName: "小林", identityMode: "pseudonym" },
      conductedAt: "2026-09-02T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: "准备好了吗？" },
        { speakerRole: "participant", body: "好的" },
      ],
      source: { sourceType: "direct" },
    });
    expect(result.title).toBe("与小林的一次采访");
  });

  it("preserves the neutral-title suffix when the display name is long", () => {
    const result = deriveRecordPresentation({
      participant: { displayName: "林".repeat(80), identityMode: "pseudonym" },
      conductedAt: "2026-09-02T00:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: "准备好了吗？" },
        { speakerRole: "participant", body: "好的" },
      ],
      source: { sourceType: "direct" },
    });
    expect(result.title).toHaveLength(48);
    expect(result.title).toMatch(/^与林+的一次采访$/u);
  });
});

describe("automated interview provenance", () => {
  const automatedDraft: RecordDraft = {
    ingestionMethod: "automated_interview",
    participant: { displayName: "小林", identityMode: "pseudonym" },
    conductedAt: "2026-09-02T08:00:00.000Z",
    messages: [
      { speakerRole: "interviewer", body: "你最近怎么样？" },
      { speakerRole: "participant", body: "正在慢慢来。" },
    ],
    source: { sourceType: "direct", platformName: "来过 · 自动采访" },
  };

  it("claims the current account as the participant owner", () => {
    expect(ownershipKindForDraft(automatedDraft)).toBe("claimed");
    expect(ownershipKindForDraft({ ...automatedDraft, ingestionMethod: undefined })).toBe("uploader");
  });

  it("locks automatic questions and the interview start time", () => {
    expect(automatedInterviewUpdateError(automatedDraft, { ...automatedDraft, conductedAt: "2026-09-03T08:00:00.000Z" })).toContain("开始时间");
    expect(automatedInterviewUpdateError(automatedDraft, { ...automatedDraft, messages: [{ speakerRole: "interviewer", body: "改过的问题" }, automatedDraft.messages[1]!] })).toContain("提问");
    expect(automatedInterviewUpdateError(automatedDraft, { ...automatedDraft, ingestionMethod: undefined })).toContain("录入标记");
  });

  it("still lets the participant revise their own words", () => {
    expect(automatedInterviewUpdateError(automatedDraft, { ...automatedDraft, messages: [automatedDraft.messages[0]!, { speakerRole: "participant", body: "我想换一种说法。" }] })).toBeNull();
  });
});
