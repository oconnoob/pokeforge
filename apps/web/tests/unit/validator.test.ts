import { describe, expect, it } from "vitest";
import { validatePokemonDraft } from "@/lib/pokemon/validator";

describe("validatePokemonDraft", () => {
  it("accepts in-range draft", () => {
    const result = validatePokemonDraft({
      name: "Testmon",
      primaryType: "fire",
      stats: { hp: 85, attack: 90, defense: 75, speed: 80 },
      moves: [
        { id: "a", name: "A", type: "fire", power: 80, accuracy: 0.9, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "b", name: "B", type: "normal", power: 60, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "c", name: "C", type: "fire", power: 70, accuracy: 0.95, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "d", name: "D", type: "rock", power: 55, accuracy: 0.9, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null }
      ]
    });

    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("rejects over-budget stats", () => {
    const result = validatePokemonDraft({
      name: "Brokenmon",
      primaryType: "fire",
      stats: { hp: 140, attack: 140, defense: 140, speed: 140 },
      moves: [
        { id: "a", name: "A", type: "fire", power: 100, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "b", name: "B", type: "fire", power: 100, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "c", name: "C", type: "fire", power: 100, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "d", name: "D", type: "fire", power: 100, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null }
      ]
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
