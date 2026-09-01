import type { InterviewMessage, SpeakerRole } from "../types";

const labelledLine = /^\s*(采访者|我|问|q|被采访者|对方|答|a)\s*[:：]\s*(.*)$/i;

function roleForLabel(label: string): SpeakerRole {
  return /^(被采访者|对方|答|a)$/i.test(label) ? "participant" : "interviewer";
}

export function parsePastedConversation(value: string): InterviewMessage[] {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const hasLabels = lines.some((line) => labelledLine.test(line));

  if (!hasLabels) {
    return lines.map((body, index) => ({
      speakerRole: index % 2 === 0 ? "interviewer" : "participant",
      body,
    }));
  }

  const messages: InterviewMessage[] = [];
  for (const line of lines) {
    const match = line.match(labelledLine);
    if (match) {
      const body = match[2]?.trim();
      if (body) messages.push({ speakerRole: roleForLabel(match[1]!), body });
      continue;
    }
    const previous = messages.at(-1);
    if (previous) previous.body += `\n${line}`;
  }
  return messages;
}
