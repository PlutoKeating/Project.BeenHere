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

const genericTitlePhrase = /^(?:我|我们|咱们|俺)?(?:不知道|没什么|没有|还好|还行|好的|好吧|嗯嗯|哈哈|谢谢|再见|就是|可以|觉得|然后|因为|所以|但是|其实|可能|应该|已经|这个|那个|事情|东西)+$/u;
const genericKeyPhrases = new Set(["一个", "一点", "一些", "我们", "自己", "什么", "时候", "现在", "最近", "真的", "好的", "because", "about", "there", "their", "would", "could", "today"]);
const latinStopWords = new Set(["the", "and", "that", "this", "with", "from", "for", "are", "was", "were", "have", "has", "had", "but", "not", "you", "your", "our", "all"]);
const titleCueRules = [
  { rank: 50, pattern: /希望|期待|想要|想把|最重要|记住|意义|hope|dream|matter|important/iu },
  { rank: 40, pattern: /热爱|喜欢|坚持|努力|改变|决定|创造|相信|love|enjoy|build|create|believe/iu },
  { rank: 30, pattern: /家人|父母|朋友|工作|生活|学习|项目|family|friend|work|life|learn|project/iu },
];

function evenlySample<T>(values: T[], limit: number): T[] {
  if (values.length <= limit) return values;
  const indexes = new Set(Array.from({ length: limit }, (_, index) => Math.round(index * (values.length - 1) / (limit - 1))));
  return [...indexes].map((index) => values[index]!).filter((value) => value !== undefined);
}

function titleClauses(draft: RecordDraft): string[] {
  return draft.messages
    .filter((message) => message.speakerRole === "participant")
    .flatMap((message) => evenlySample(message.body.split(/[。！？!?；;，,.\n…]+/u), 8))
    .map((clause) => clause.trim())
    .filter((clause) => clause.length >= 2)
    .map((clause) => Array.from(clause).slice(0, 120).join(""));
}

function phraseCandidates(clause: string): string[] {
  const phrases: string[] = [];
  for (const run of clause.match(/[\p{Script=Han}]{2,}/gu) ?? []) {
    const characters = Array.from(run);
    for (let size = 2; size <= Math.min(10, characters.length); size += 1) {
      for (let start = 0; start <= characters.length - size; start += 1) phrases.push(characters.slice(start, start + size).join(""));
    }
  }
  const words = (clause.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/gu) ?? []).filter((word) => !latinStopWords.has(word));
  for (let size = 1; size <= Math.min(3, words.length); size += 1) {
    for (let start = 0; start <= words.length - size; start += 1) phrases.push(words.slice(start, start + size).join(" "));
  }
  return phrases;
}

function repeatedKeyPhrase(clauses: string[]): string | null {
  const occurrences = new Map<string, Set<number>>();
  clauses.forEach((clause, clauseIndex) => {
    for (const phrase of phraseCandidates(clause)) {
      if (genericTitlePhrase.test(phrase) || genericKeyPhrases.has(phrase)) continue;
      const indexes = occurrences.get(phrase) ?? new Set<number>();
      indexes.add(clauseIndex);
      occurrences.set(phrase, indexes);
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

function cueRank(clause: string): number {
  return titleCueRules.find((rule) => rule.pattern.test(clause))?.rank ?? 0;
}

function representativeClause(clauses: string[], keyPhrase: string | null): string {
  if (keyPhrase) return clauses.find((clause) => clause.toLowerCase().includes(keyPhrase.toLowerCase())) ?? "";
  return clauses.map((clause, index) => {
    const length = Array.from(clause).length;
    const readableLength = length >= 5 && length <= 36 ? 20 : Math.max(0, 20 - Math.abs(length - 20));
    return { clause, index, score: cueRank(clause) + readableLength };
  }).sort((left, right) => right.score - left.score || right.index - left.index)[0]?.clause ?? "";
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
  const representative = representativeClause(clauses, keyPhrase);
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
