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

const genericTitlePhrase = /^(?:我|我们|咱们|俺)?(?:不知道|没什么|没有|还好|还行|就是|可以|觉得|然后|因为|所以|但是|其实|可能|应该|已经|这个|那个|事情|东西)+$/u;

function titleClauses(draft: RecordDraft): string[] {
  return draft.messages
    .filter((message) => message.speakerRole === "participant")
    .flatMap((message) => {
      const clauses = message.body.split(/[。！？!?；;，,\n…]+/u);
      return clauses.length <= 8 ? clauses : [...clauses.slice(0, 4), ...clauses.slice(-4)];
    })
    .map((clause) => clause.trim())
    .filter((clause) => clause.length >= 2)
    .map((clause) => Array.from(clause).slice(0, 120).join(""));
}

function repeatedKeyPhrase(clauses: string[]): string | null {
  const occurrences = new Map<string, Set<number>>();
  clauses.forEach((clause, clauseIndex) => {
    for (const run of clause.match(/[\p{Script=Han}]{2,}/gu) ?? []) {
      const characters = Array.from(run);
      for (let size = 2; size <= Math.min(10, characters.length); size += 1) {
        for (let start = 0; start <= characters.length - size; start += 1) {
          const phrase = characters.slice(start, start + size).join("");
          if (genericTitlePhrase.test(phrase)) continue;
          const indexes = occurrences.get(phrase) ?? new Set<number>();
          indexes.add(clauseIndex);
          occurrences.set(phrase, indexes);
        }
      }
    }
  });
  return [...occurrences.entries()]
    .filter(([, indexes]) => indexes.size >= 2)
    .sort(([left, leftIndexes], [right, rightIndexes]) => {
      const leftLength = Array.from(left).length;
      const rightLength = Array.from(right).length;
      return rightIndexes.size * rightLength - leftIndexes.size * leftLength
        || rightIndexes.size - leftIndexes.size
        || rightLength - leftLength
        || (left < right ? -1 : left > right ? 1 : 0);
    })[0]?.[0] ?? null;
}

function reassembleTitle(clause: string): string {
  return clause
    .replace(/^[“”"'「」『』\s]+|[“”"'「」『』\s]+$/gu, "")
    .replace(/^(?:我们|咱们|我|俺)(?:(?:最近|现在|一直|真的|还是|也|会|要|想|希望|觉得|认为|正在|在)\s*)*/u, "")
    .replace(/^(?:嗯+|呃+|啊+|唉+|就是|其实|大概|可能)\s*/u, "")
    .replace(/[。！？!?；;，,：:]+$/u, "")
    .trim();
}

export function deriveInterviewTitle(draft: RecordDraft): string {
  const clauses = titleClauses(draft);
  const keyPhrase = repeatedKeyPhrase(clauses);
  const representative = (keyPhrase ? clauses.find((clause) => clause.includes(keyPhrase)) : clauses.at(-1)) ?? "";
  const title = reassembleTitle(representative) || keyPhrase;
  const meaningfulCharacters = new Set(Array.from(title ?? "").filter((character) => /[\p{L}\p{N}]/u.test(character)));
  const result = title && meaningfulCharacters.size >= 2 && !genericTitlePhrase.test(title) ? title : `与${draft.participant.displayName}的一次采访`;
  return Array.from(result).slice(0, 48).join("");
}

export function deriveRecordPresentation(draft: RecordDraft): { title: string; excerpt: string } {
  const answer = draft.messages.find((message) => message.speakerRole === "participant")?.body.trim();
  return {
    title: deriveInterviewTitle(draft),
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
