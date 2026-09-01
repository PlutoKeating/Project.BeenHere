import { describe, expect, it } from "vitest";
import { conversationFromOcr } from "./ocr-conversation";

const box = (left: number, top: number, right: number, bottom: number): [number, number][] => [
  [left, top], [right, top], [right, bottom], [left, bottom],
];

describe("OCR conversation layout parser", () => {
  it("turns right and left chat text into interviewer and participant messages", () => {
    const result = conversationFromOcr([{
      image: { width: 1000, height: 1600 },
      items: [
        { text: "9月1日 10:24", score: 0.99, poly: box(430, 80, 570, 110) },
        { text: "你最近在想", score: 0.96, poly: box(610, 180, 930, 220) },
        { text: "什么？", score: 0.94, poly: box(780, 225, 930, 265) },
        { text: "想去一个没有", score: 0.93, poly: box(70, 360, 390, 400) },
        { text: "去过的地方。", score: 0.91, poly: box(70, 405, 390, 445) },
      ],
    }]);

    expect(result.messages).toEqual([
      { speakerRole: "interviewer", body: "你最近在想什么？", confidence: 0.94 },
      { speakerRole: "participant", body: "想去一个没有去过的地方。", confidence: 0.91 },
    ]);
    expect(result.excludedLineCount).toBe(1);
  });

  it("removes the repeated boundary when consecutive screenshots overlap", () => {
    const result = conversationFromOcr([
      {
        image: { width: 1000, height: 1600 },
        items: [
          { text: "为什么来这里？", score: 0.98, poly: box(620, 120, 930, 165) },
          { text: "想换一种生活。", score: 0.96, poly: box(70, 280, 390, 325) },
        ],
      },
      {
        image: { width: 1000, height: 1600 },
        items: [
          { text: "想换一种生活。", score: 0.95, poly: box(70, 120, 390, 165) },
          { text: "接下来呢？", score: 0.97, poly: box(700, 280, 930, 325) },
          { text: "去看看海。", score: 0.72, poly: box(70, 430, 310, 475) },
        ],
      },
    ]);

    expect(result.messages.map(({ speakerRole, body }) => ({ speakerRole, body }))).toEqual([
      { speakerRole: "interviewer", body: "为什么来这里？" },
      { speakerRole: "participant", body: "想换一种生活。" },
      { speakerRole: "interviewer", body: "接下来呢？" },
      { speakerRole: "participant", body: "去看看海。" },
    ]);
    expect(result.lowConfidenceMessageCount).toBe(1);
  });

  it("caps imported messages at the canonical record limit", () => {
    const result = conversationFromOcr([{
      image: { width: 1000, height: 12000 },
      items: Array.from({ length: 101 }, (_, index) => ({
        text: `消息 ${index + 1}`,
        score: 0.99,
        poly: index % 2 === 0
          ? box(700, index * 100, 930, index * 100 + 35)
          : box(70, index * 100, 300, index * 100 + 35),
      })),
    }]);

    expect(result.messages).toHaveLength(100);
    expect(result.truncatedMessageCount).toBe(1);
  });

  it("keeps visibly separated bubbles from the same person as separate messages", () => {
    const result = conversationFromOcr([{
      image: { width: 1000, height: 1600 },
      items: [
        { text: "第一个问题", score: 0.98, poly: box(650, 120, 930, 160) },
        { text: "补充问一句", score: 0.97, poly: box(650, 205, 930, 245) },
      ],
    }]);

    expect(result.messages.map(({ body }) => body)).toEqual(["第一个问题", "补充问一句"]);
  });
});
