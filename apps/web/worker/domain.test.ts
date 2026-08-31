import { describe, expect, it } from "vitest";
import { assertEditorialTransition, formatArchiveNumber, normalizeExclusions } from "./domain";

describe("archive numbering", () => {
  it("formats a stable six-digit public number", () => {
    expect(formatArchiveNumber(821)).toBe("BH-000821");
  });

  it("rejects values outside the public number range", () => {
    expect(() => formatArchiveNumber(0)).toThrow(RangeError);
    expect(() => formatArchiveNumber(1_000_000)).toThrow(RangeError);
  });
});

describe("editorial lifecycle", () => {
  it("permits review then approval", () => {
    expect(() => assertEditorialTransition("editorial_review", "participant_review")).not.toThrow();
    expect(() => assertEditorialTransition("participant_review", "approved")).not.toThrow();
  });

  it("does not permit publishing before approval", () => {
    expect(() => assertEditorialTransition("editorial_review", "published")).toThrow("不能从 editorial_review 进入 published");
  });
});

describe("drift exclusions", () => {
  it("normalizes, validates and de-duplicates recent archive numbers", () => {
    expect(normalizeExclusions(["bh-000001", "bad", " BH-000002 ", "BH-000001"])).toEqual(["BH-000001", "BH-000002"]);
  });
});
