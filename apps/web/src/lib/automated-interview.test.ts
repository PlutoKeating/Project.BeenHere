import { describe, expect, it } from "vitest";
import { beginInterview, finishInterview, interviewToDraft, submitInterviewAnswer } from "./automated-interview";

describe("automated interview", () => {
  it("uses one contextual follow-up before returning to the fixed question path", () => {
    const started = beginInterview(new Date("2026-09-02T08:00:00.000Z"));
    const followed = submitInterviewAnswer(started, "最近每天都在画画，画画让我安静下来");

    expect(followed.questionIndex).toBe(0);
    expect(followed.awaitingFollowUp).toBe(true);
    expect(followed.messages.at(-1)?.body).toContain("画画");

    const continued = submitInterviewAnswer(followed, "因为画的时候不用急着回答别人");
    expect(continued.questionIndex).toBe(1);
    expect(continued.awaitingFollowUp).toBe(false);
    expect(continued.messages.at(-1)?.body).toContain("你还记得的事");
  });

  it("ranks competing keywords before applying a decomposition", () => {
    const state = submitInterviewAnswer(beginInterview(), "最近常和朋友一起画画");

    expect(state.messages.at(-1)?.body).toContain("朋友");
    expect(state.messages.at(-1)?.body).not.toContain("画画");
  });

  it("does not probe a sensitive disclosure and offers control back to the participant", () => {
    const state = submitInterviewAnswer(beginInterview(), "我因为抑郁休学了");
    const interviewerBodies = state.messages.filter((message) => message.speakerRole === "interviewer").map((message) => message.body);

    expect(state.questionIndex).toBe(1);
    expect(state.awaitingFollowUp).toBe(false);
    expect(interviewerBodies).toContain("谢谢你愿意说到这里。你不需要解释原因，也可以随时跳过或结束采访。");
  });

  it("ends instead of continuing when immediate-danger language is detected", () => {
    const state = submitInterviewAnswer(beginInterview(), "我现在就想自杀");

    expect(state.phase).toBe("complete");
    expect(state.messages.at(-1)?.body).toContain("当地紧急服务");
  });

  it("supports skipping and manual completion without inventing participant text", () => {
    const started = beginInterview();
    const skipped = submitInterviewAnswer(started, "跳过");
    const finished = finishInterview(skipped);

    expect(skipped.messages.some((message) => message.speakerRole === "participant" && message.body === "跳过")).toBe(false);
    expect(finished.phase).toBe("complete");
  });

  it("converts only the visible transcript into the existing direct-source draft", () => {
    const started = beginInterview(new Date("2026-09-02T08:00:00.000Z"));
    const answered = finishInterview(submitInterviewAnswer(started, "最近在准备搬家"));
    const draft = interviewToDraft(answered);

    expect(draft.conductedAt).toBe("2026-09-02T08:00:00.000Z");
    expect(draft.source).toEqual({ sourceType: "direct", platformName: "来过 · 自动采访" });
    expect(draft.participant).toEqual({ displayName: "", identityMode: "pseudonym" });
    expect(draft.messages).toEqual(answered.messages.map(({ speakerRole, body }) => ({ speakerRole, body })));
  });

  it("refuses draft conversion before completion or after a safety stop", () => {
    expect(() => interviewToDraft(beginInterview())).toThrow("采访尚未结束");
    expect(() => interviewToDraft(submitInterviewAnswer(beginInterview(), "我现在就想自杀"))).toThrow("安全原因");
  });
});
