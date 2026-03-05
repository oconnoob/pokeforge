import { describe, expect, it } from "vitest";
import { isTypewriterComplete, nextTypedLength } from "@/lib/battle/typewriter";

describe("nextTypedLength", () => {
  it("advances by step until total length", () => {
    expect(nextTypedLength(0, 10, 3)).toBe(3);
    expect(nextTypedLength(3, 10, 3)).toBe(6);
    expect(nextTypedLength(9, 10, 3)).toBe(10);
  });

  it("handles empty messages", () => {
    expect(nextTypedLength(0, 0, 2)).toBe(0);
  });
});

describe("isTypewriterComplete", () => {
  it("reports completion based on current and total", () => {
    expect(isTypewriterComplete(5, 10)).toBe(false);
    expect(isTypewriterComplete(10, 10)).toBe(true);
    expect(isTypewriterComplete(11, 10)).toBe(true);
  });
});
