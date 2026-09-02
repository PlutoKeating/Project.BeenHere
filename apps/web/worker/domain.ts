import type { RecordDraft } from "./types";

export function formatRecordNumber(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 999999) {
    throw new RangeError("Record sequence must be an integer between 1 and 999999.");
  }
  return `BH-${String(sequence).padStart(6, "0")}`;
}

export function normalizeExclusions(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toUpperCase()).filter((value) => /^BH-\d{6}$/.test(value)))].slice(-20);
}

export function deriveRecordPresentation(draft: RecordDraft): { title: string; excerpt: string } {
  const question = draft.messages.find((message) => message.speakerRole === "interviewer")?.body.trim();
  const answer = draft.messages.find((message) => message.speakerRole === "participant")?.body.trim();
  return {
    title: (question || `与${draft.participant.displayName}的一次采访`).slice(0, 120),
    excerpt: (answer || draft.messages[0]?.body.trim() || "一段采访对话").slice(0, 300),
  };
}

export function ownershipKindForDraft(draft: RecordDraft): "claimed" | "uploader" {
  return draft.ingestionMethod === "automated_interview" ? "claimed" : "uploader";
}

export function automatedInterviewUpdateError(previous: RecordDraft, next: RecordDraft): string | null {
  if (previous.ingestionMethod !== "automated_interview") return null;
  if (next.ingestionMethod !== "automated_interview") return "自动采访的录入标记不可移除。";
  if (next.conductedAt !== previous.conductedAt) return "自动采访的开始时间不可修改。";
  const interviewerBodies = (draft: RecordDraft) => draft.messages
    .filter((message) => message.speakerRole === "interviewer")
    .map((message) => message.body);
  if (JSON.stringify(interviewerBodies(next)) !== JSON.stringify(interviewerBodies(previous))) {
    return "自动采访者的提问不可修改、删除或新增。";
  }
  return null;
}
