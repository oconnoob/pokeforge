import { describe, expect, it } from "vitest";
import { nextGridIndex } from "@/lib/battle/navigation";

describe("nextGridIndex", () => {
  it("moves right within row", () => {
    expect(nextGridIndex(0, "ArrowRight", 2, 4)).toBe(1);
  });

  it("clamps right at row end", () => {
    expect(nextGridIndex(1, "ArrowRight", 2, 4)).toBe(1);
  });

  it("moves down by column count", () => {
    expect(nextGridIndex(0, "ArrowDown", 2, 4)).toBe(2);
  });

  it("clamps down at last row", () => {
    expect(nextGridIndex(3, "ArrowDown", 2, 4)).toBe(3);
  });

  it("moves up by column count", () => {
    expect(nextGridIndex(3, "ArrowUp", 2, 4)).toBe(1);
  });

  it("clamps left/up at minimum", () => {
    expect(nextGridIndex(0, "ArrowLeft", 2, 4)).toBe(0);
    expect(nextGridIndex(0, "ArrowUp", 2, 4)).toBe(0);
  });

  it("handles partial last row", () => {
    expect(nextGridIndex(2, "ArrowRight", 2, 5)).toBe(3);
    expect(nextGridIndex(3, "ArrowRight", 2, 5)).toBe(3);
    expect(nextGridIndex(3, "ArrowDown", 2, 5)).toBe(4);
  });
});
