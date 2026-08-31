import { HttpError } from "./http";

export type EditorialState = "editorial_review" | "participant_review" | "approved" | "published" | "withdrawn";

const transitions: Record<EditorialState, readonly EditorialState[]> = {
  editorial_review: ["participant_review"],
  participant_review: ["editorial_review", "approved"],
  approved: ["published", "editorial_review"],
  published: ["approved", "withdrawn"],
  withdrawn: [],
};

export function assertEditorialTransition(from: EditorialState, to: EditorialState): void {
  if (!transitions[from].includes(to)) {
    throw new HttpError(409, "invalid_editorial_state", `不能从 ${from} 进入 ${to}。`);
  }
}

export function formatArchiveNumber(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 999999) {
    throw new RangeError("Archive sequence must be an integer between 1 and 999999.");
  }
  return `BH-${String(sequence).padStart(6, "0")}`;
}

export function normalizeExclusions(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toUpperCase()).filter((value) => /^BH-\d{6}$/.test(value)))].slice(-20);
}
