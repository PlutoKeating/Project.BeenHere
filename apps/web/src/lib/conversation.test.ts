import { describe, expect, it } from "vitest";
import { parsePastedConversation } from "./conversation";

describe("pasted conversation parser", () => {
  it("recognizes common Chinese speaker labels and joins continuation lines", () => {
    expect(parsePastedConversation(`我：你为什么来到这里？\n这是一个补充问题。\n对方：只是想换一种生活。`)).toEqual([
      { speakerRole: "interviewer", body: "你为什么来到这里？\n这是一个补充问题。" },
      { speakerRole: "participant", body: "只是想换一种生活。" },
    ]);
  });

  it("alternates unlabelled non-empty lines", () => {
    expect(parsePastedConversation("最近过得好吗？\n\n还不错。\n接下来想做什么？\n去看看海。")) .toEqual([
      { speakerRole: "interviewer", body: "最近过得好吗？" },
      { speakerRole: "participant", body: "还不错。" },
      { speakerRole: "interviewer", body: "接下来想做什么？" },
      { speakerRole: "participant", body: "去看看海。" },
    ]);
  });

  it("returns no messages for blank input", () => {
    expect(parsePastedConversation(" \n\n ")).toEqual([]);
  });
});
