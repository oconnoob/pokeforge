import { describe, expect, it } from "vitest";
import { DEFAULT_TURN_TIMELINE, sanitizeTurnTimeline } from "@/lib/battle/timeline";

describe("sanitizeTurnTimeline", () => {
  it("uses defaults when no overrides are provided", () => {
    expect(sanitizeTurnTimeline()).toEqual(DEFAULT_TURN_TIMELINE);
  });

  it("enforces minimum impact and reveal timing order", () => {
    expect(sanitizeTurnTimeline({ impactMs: 10, logRevealMs: 50 })).toEqual({
      impactMs: 80,
      logRevealMs: 200
    });
  });

  it("keeps valid custom timings", () => {
    expect(sanitizeTurnTimeline({ impactMs: 280, logRevealMs: 640 })).toEqual({
      impactMs: 280,
      logRevealMs: 640
    });
  });
});
