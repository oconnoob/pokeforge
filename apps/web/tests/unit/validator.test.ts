import { describe, expect, it } from "vitest";
import { validatePokemonDraft } from "@/lib/pokemon/validator";

describe("validatePokemonDraft", () => {
  it("accepts in-range draft", () => {
    const result = validatePokemonDraft({
      name: "Testmon",
      primaryType: "fire",
      stats: { hp: 85, attack: 90, defense: 75, speed: 80 },
      behaviorScript: {
        version: "1",
        hooks: [
          {
            hook: "onAttack",
            effects: [{ type: "applyStatus", status: "burn", turns: 2, chance: 0.2 }]
          }
        ]
      }
    });

    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("rejects over-budget stats", () => {
    const result = validatePokemonDraft({
      name: "Brokenmon",
      primaryType: "dragon",
      stats: { hp: 140, attack: 140, defense: 140, speed: 140 },
      behaviorScript: { version: "1", hooks: [] }
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
