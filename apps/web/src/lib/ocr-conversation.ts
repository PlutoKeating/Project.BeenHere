import type { SpeakerRole } from "../types";

export type OcrPoint = [number, number];

export interface OcrLine {
  poly: OcrPoint[];
  text: string;
  score: number;
}

export interface OcrImageResult {
  image: { width: number; height: number };
  items: OcrLine[];
}

export interface OcrConversationMessage {
  speakerRole: SpeakerRole;
  body: string;
  confidence: number;
}

export interface OcrConversationResult {
  messages: OcrConversationMessage[];
  excludedLineCount: number;
  lowConfidenceMessageCount: number;
  truncatedMessageCount: number;
}

interface PositionedLine extends OcrLine {
  speakerRole: SpeakerRole;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function bounds(line: OcrLine) {
  const xs = line.poly.map(([x]) => x);
  const ys = line.poly.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

function positionedLine(line: OcrLine, width: number): PositionedLine | null {
  const text = line.text.trim();
  if (!text || !Number.isFinite(line.score) || line.poly.length < 4) return null;
  const position = bounds(line);
  const leftMargin = position.left;
  const rightMargin = width - position.right;
  if (Math.abs(leftMargin - rightMargin) < width * 0.08) return null;
  return {
    ...line,
    ...position,
    text,
    speakerRole: leftMargin < rightMargin ? "participant" : "interviewer",
  };
}

function shouldMerge(previous: PositionedLine, current: PositionedLine, width: number): boolean {
  if (previous.speakerRole !== current.speakerRole) return false;
  const lineHeight = Math.max(previous.bottom - previous.top, current.bottom - current.top);
  const verticalGap = current.top - previous.bottom;
  const previousAnchor = previous.speakerRole === "participant" ? previous.left : previous.right;
  const currentAnchor = current.speakerRole === "participant" ? current.left : current.right;
  return verticalGap >= -lineHeight * 0.25
    && verticalGap <= lineHeight * 0.75
    && Math.abs(previousAnchor - currentAnchor) <= width * 0.12;
}

function joinText(previous: string, current: string): string {
  return /[A-Za-z0-9]$/.test(previous) && /^[A-Za-z0-9]/.test(current)
    ? `${previous} ${current}`
    : `${previous}${current}`;
}

export function conversationFromOcr(images: OcrImageResult[]): OcrConversationResult {
  const messages: OcrConversationMessage[] = [];
  let excludedLineCount = 0;

  for (const image of images) {
    const lines = image.items
      .map((line) => positionedLine(line, image.image.width))
      .filter((line): line is PositionedLine => {
        if (!line) excludedLineCount += 1;
        return line !== null;
      })
      .sort((a, b) => a.top - b.top || a.left - b.left);

    const imageMessages: OcrConversationMessage[] = [];
    let previousLine: PositionedLine | null = null;
    for (const line of lines) {
      const previousMessage = imageMessages.at(-1);
      if (previousLine && previousMessage && shouldMerge(previousLine, line, image.image.width)) {
        previousMessage.body = joinText(previousMessage.body, line.text);
        previousMessage.confidence = Math.min(previousMessage.confidence, line.score);
      } else {
        imageMessages.push({ speakerRole: line.speakerRole, body: line.text, confidence: line.score });
      }
      previousLine = line;
    }

    const maxOverlap = Math.min(messages.length, imageMessages.length);
    let overlap = 0;
    for (let size = maxOverlap; size > 0; size -= 1) {
      const previousTail = messages.slice(-size);
      const currentHead = imageMessages.slice(0, size);
      if (previousTail.every((message, index) => message.speakerRole === currentHead[index]!.speakerRole && message.body === currentHead[index]!.body)) {
        overlap = size;
        break;
      }
    }
    messages.push(...imageMessages.slice(overlap));
  }

  const truncatedMessageCount = Math.max(0, messages.length - 100);
  if (truncatedMessageCount) messages.splice(100);
  return {
    messages,
    excludedLineCount,
    lowConfidenceMessageCount: messages.filter((message) => message.confidence < 0.8).length,
    truncatedMessageCount,
  };
}
