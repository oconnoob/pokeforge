import { describe, expect, it } from "vitest";
import { predictFirstActor } from "@/lib/battle/turn-order";
import type { BattleCombatant } from "@pokeforge/battle-engine";

const makeCombatant = (overrides: Partial<BattleCombatant> = {}): BattleCombatant => ({
  id: "a",
  name: "Alpha",
  types: ["normal"],
  stats: { hp: 100, attack: 80, defense: 70, speed: 90 },
  currentHp: 100,
  status: null,
  activeEffects: [],
  moveUsage: {},
  moves: [
    { id: "quick", name: "Quick Hit", type: "normal", power: 30, accuracy: 1, priority: 1 },
    { id: "heavy", name: "Heavy Slam", type: "normal", power: 80, accuracy: 1 }
  ],
  ...overrides
});

describe("predictFirstActor", () => {
  it("prefers higher priority", () => {
    const player = makeCombatant();
    const opponent = makeCombatant({
      id: "b",
      name: "Beta",
      stats: { hp: 100, attack: 80, defense: 70, speed: 120 },
      moves: [{ id: "slow", name: "Slow Hit", type: "normal", power: 80, accuracy: 1 }]
    });

    const result = predictFirstActor(player, opponent, player.moves[0]);
    expect(result.firstActor).toBe("player");
    expect(result.reason).toContain("priority");
  });

  it("falls back to speed when priorities match", () => {
    const player = makeCombatant({
      stats: { hp: 100, attack: 80, defense: 70, speed: 75 },
      moves: [{ id: "a", name: "A", type: "normal", power: 50, accuracy: 1 }]
    });
    const opponent = makeCombatant({
      id: "b",
      name: "Beta",
      stats: { hp: 100, attack: 80, defense: 70, speed: 110 },
      moves: [{ id: "b", name: "B", type: "normal", power: 50, accuracy: 1 }]
    });

    const result = predictFirstActor(player, opponent, player.moves[0]);
    expect(result.firstActor).toBe("opponent");
    expect(result.reason).toContain("speed");
  });

  it("uses player-first tie break on equal speed and priority", () => {
    const player = makeCombatant({
      moves: [{ id: "a", name: "A", type: "normal", power: 50, accuracy: 1 }]
    });
    const opponent = makeCombatant({
      id: "b",
      name: "Beta",
      moves: [{ id: "b", name: "B", type: "normal", power: 50, accuracy: 1 }]
    });

    const result = predictFirstActor(player, opponent, player.moves[0]);
    expect(result.firstActor).toBe("player");
    expect(result.reason).toContain("tie");
  });
});
