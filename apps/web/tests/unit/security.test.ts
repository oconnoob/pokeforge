import { describe, expect, it } from "vitest";
import { evaluatePromptSafety } from "@/lib/security/prompt-safety";
import { InMemoryRateLimiter } from "@/lib/security/rate-limit";

describe("prompt safety", () => {
  it("accepts safe prompt", () => {
    const result = evaluatePromptSafety("Generate a calm grass pokemon with vine support skills");
    expect(result.safe).toBe(true);
  });

  it("blocks disallowed content", () => {
    const result = evaluatePromptSafety("Create a pokemon about terrorism references");
    expect(result.safe).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});

describe("rate limiter", () => {
  it("blocks requests over limit in window", () => {
    const limiter = new InMemoryRateLimiter();
    const now = 1_000_000;

    const first = limiter.consume("key", 2, 10_000, now);
    const second = limiter.consume("key", 2, 10_000, now + 5);
    const third = limiter.consume("key", 2, 10_000, now + 8);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });
});
