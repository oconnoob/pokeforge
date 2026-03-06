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

  it("accepts moves that include inflictStatus metadata", () => {
    const result = validatePokemonDraft({
      name: "Statusmon",
      primaryType: "fire",
      stats: { hp: 88, attack: 91, defense: 74, speed: 82 },
      moves: [
        {
          id: "burn-1",
          name: "Scorch Pulse",
          type: "fire",
          power: 72,
          accuracy: 0.92,
          maxPp: 20,
          behaviorVersion: "v1",
          behaviorProgram: null,
          inflictStatus: { kind: "burn", chance: 0.25, turns: 2 }
        },
        { id: "b", name: "B", type: "normal", power: 60, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "c", name: "C", type: "fire", power: 70, accuracy: 0.95, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "d", name: "D", type: "rock", power: 55, accuracy: 0.9, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null }
      ]
    });

    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("accepts composable v2 behavior programs for rng, dodge, and type guard", () => {
    const result = validatePokemonDraft({
      name: "ComboMon",
      primaryType: "fire",
      stats: { hp: 92, attack: 88, defense: 82, speed: 80 },
      moves: [
        {
          id: "combo-1",
          name: "Wild Ember",
          type: "fire",
          power: 68,
          accuracy: 0.9,
          maxPp: 20,
          behaviorVersion: "v2",
          behaviorProgram: {
            version: "2",
            steps: [{ type: "random_spike_attack", minMultiplier: 0.8, maxMultiplier: 2.1, curve: 1.2 }]
          }
        },
        {
          id: "combo-2",
          name: "Mirror Guard",
          type: "psychic",
          power: 35,
          accuracy: 1,
          maxPp: 18,
          behaviorVersion: "v2",
          behaviorProgram: {
            version: "2",
            steps: [{ type: "apply_type_guard", types: ["fire"], reductionRatio: 0.5, turns: 2 }]
          }
        },
        {
          id: "combo-3",
          name: "Sidestep",
          type: "normal",
          power: 30,
          accuracy: 1,
          maxPp: 20,
          behaviorVersion: "v2",
          behaviorProgram: {
            version: "2",
            steps: [{ type: "apply_dodge_window", evadeChance: 0.35, hits: 1, turns: 2 }]
          }
        },
        { id: "combo-4", name: "Punch", type: "fighting", power: 60, accuracy: 0.95, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null }
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
