import { describe, expect, it } from "vitest";
import { validateBalance } from "@/lib/pokemon/balance";
import { type PokemonDraft } from "@/lib/pokemon/validator";

const makeDraft = (overrides: Partial<PokemonDraft> = {}): PokemonDraft => ({
  name: "Balancer",
  primaryType: "fire",
  stats: { hp: 100, attack: 90, defense: 80, speed: 80 },
  moves: [
    { id: "a", name: "A", type: "fire", power: 80, accuracy: 0.9, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
    { id: "b", name: "B", type: "normal", power: 60, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
    { id: "c", name: "C", type: "rock", power: 70, accuracy: 0.9, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
    { id: "d", name: "D", type: "fire", power: 65, accuracy: 0.95, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null }
  ],
  ...overrides
});

describe("validateBalance", () => {
  it("returns a report for normal drafts", () => {
    const result = validateBalance(makeDraft());
    expect(result.report.simulation.matches).toBeGreaterThan(0);
    expect(result.report.thresholds.minWinRate).toBeGreaterThan(0);
  });

  it("rejects highly overpowered move profiles", () => {
    const result = validateBalance(
      makeDraft({
        moves: [
          {
            id: "x1",
            name: "X1",
            type: "fire",
            power: 120,
            accuracy: 1,
            maxPp: 40,
            behaviorVersion: "v2",
            behaviorProgram: {
              version: "2",
              steps: [{ type: "ramp_power_by_use_count", gain: 0.15, minMultiplier: 1, maxMultiplier: 2.3 }]
            }
          },
          {
            id: "x2",
            name: "X2",
            type: "fire",
            power: 120,
            accuracy: 1,
            maxPp: 40,
            behaviorVersion: "v2",
            behaviorProgram: {
              version: "2",
              steps: [{ type: "ramp_power_by_use_count", gain: 0.15, minMultiplier: 1, maxMultiplier: 2.3 }]
            }
          },
          {
            id: "x3",
            name: "X3",
            type: "fire",
            power: 120,
            accuracy: 1,
            maxPp: 40,
            behaviorVersion: "v2",
            behaviorProgram: {
              version: "2",
              steps: [{ type: "ramp_power_by_use_count", gain: 0.15, minMultiplier: 1, maxMultiplier: 2.3 }]
            }
          },
          {
            id: "x4",
            name: "X4",
            type: "fire",
            power: 120,
            accuracy: 1,
            maxPp: 40,
            behaviorVersion: "v2",
            behaviorProgram: {
              version: "2",
              steps: [{ type: "ramp_power_by_use_count", gain: 0.15, minMultiplier: 1, maxMultiplier: 2.3 }]
            }
          }
        ]
      })
    );

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain("SIMULATION_BALANCE_FAILED");
  });
});
