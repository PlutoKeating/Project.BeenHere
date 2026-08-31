import { describe, expect, it } from "vitest";
import { formatRecordNumber, normalizeExclusions } from "./domain";

describe("record numbering", () => {
  it("formats a stable six-digit public number", () => {
    expect(formatRecordNumber(821)).toBe("BH-000821");
  });

  it("rejects values outside the public number range", () => {
    expect(() => formatRecordNumber(0)).toThrow(RangeError);
    expect(() => formatRecordNumber(1_000_000)).toThrow(RangeError);
  });
});

describe("drift exclusions", () => {
  it("normalizes and de-duplicates recent record numbers", () => {
    expect(normalizeExclusions(["bh-000001", "bad", " BH-000002 ", "BH-000001"])).toEqual(["BH-000001", "BH-000002"]);
  });
});
