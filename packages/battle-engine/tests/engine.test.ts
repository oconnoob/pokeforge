import { describe, expect, it } from "vitest";
import {
  calculateBaseDamage,
  calculateTypeEffectiveness,
  createBattle,
  resolveTurn,
  chooseBestMove,
  type BattlePokemonTemplate,
  type RandomSource
} from "../src/index";

const makePokemon = (overrides: Partial<BattlePokemonTemplate> = {}): BattlePokemonTemplate => ({
  id: "poke-1",
  name: "Testmon",
  types: ["fire"],
  stats: {
    hp: 100,
    attack: 80,
    defense: 70,
    speed: 60
  },
  moves: [
    { id: "ember", name: "Ember", type: "fire", power: 40, accuracy: 1 },
    { id: "tackle", name: "Tackle", type: "normal", power: 45, accuracy: 1 }
  ],
  ...overrides
});

const sequenceRng = (...values: number[]): RandomSource => {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
};

describe("type effectiveness", () => {
  it("applies super-effective and resisted multipliers", () => {
    expect(calculateTypeEffectiveness("fire", ["grass"])).toBe(2);
    expect(calculateTypeEffectiveness("fire", ["water"])).toBe(0.5);
  });
});

describe("damage tuning", () => {
  it("avoids routine one-hit knockouts for common type-advantage matchups", () => {
    const pikachu = {
      ...makePokemon({
        id: "pikachu",
        name: "Pikachu",
        types: ["electric"],
        stats: { hp: 92, attack: 78, defense: 58, speed: 112 },
        moves: [{ id: "volt", name: "Volt Tackle", type: "electric", power: 94, accuracy: 1 }]
      }),
      currentHp: 92,
      status: null
    };
    const gyarados = {
      ...makePokemon({
        id: "gyarados",
        name: "Gyarados",
        types: ["water"],
        stats: { hp: 122, attack: 100, defense: 82, speed: 90 },
        moves: [{ id: "surf", name: "Surf", type: "water", power: 76, accuracy: 1 }]
      }),
      currentHp: 122,
      status: null
    };

    const damage = calculateBaseDamage(pikachu, gyarados, pikachu.moves[0], sequenceRng(0.5));
    expect(damage).toBeLessThan(gyarados.stats.hp);
  });
});

describe("chooseBestMove", () => {
  it("prefers super effective move", () => {
    const attacker = {
      ...makePokemon(),
      moves: [
        { id: "scratch", name: "Scratch", type: "normal", power: 40, accuracy: 1 },
        { id: "ember", name: "Ember", type: "fire", power: 40, accuracy: 1 }
      ],
      currentHp: 100,
      status: null
    };

    const defender = {
      ...makePokemon({ types: ["grass"] }),
      currentHp: 100,
      status: null
    };

    expect(chooseBestMove(attacker, defender).id).toBe("ember");
  });

  it("prefers a likely finishing move", () => {
    const attacker = {
      ...makePokemon(),
      currentHp: 100,
      status: null,
      moves: [
        { id: "chip", name: "Chip", type: "normal", power: 20, accuracy: 1 },
        { id: "blast", name: "Blast", type: "normal", power: 70, accuracy: 0.95 }
      ]
    };
    const defender = {
      ...makePokemon({ stats: { hp: 60, attack: 60, defense: 60, speed: 50 } }),
      currentHp: 14,
      status: null
    };

    expect(chooseBestMove(attacker, defender).id).toBe("blast");
  });

  it("can choose close-score alternatives when random source is provided", () => {
    const attacker = {
      ...makePokemon(),
      currentHp: 100,
      status: null,
      moves: [
        { id: "a", name: "A", type: "normal", power: 50, accuracy: 1 },
        { id: "b", name: "B", type: "normal", power: 49, accuracy: 1 }
      ]
    };
    const defender = {
      ...makePokemon(),
      currentHp: 100,
      status: null
    };

    expect(chooseBestMove(attacker, defender, sequenceRng(0.1)).id).toBe("b");
    expect(chooseBestMove(attacker, defender, sequenceRng(0.9)).id).toBe("a");
  });

  it("ignores exhausted moves when selecting a move", () => {
    const attacker = {
      ...makePokemon(),
      currentHp: 100,
      status: null,
      moves: [
        { id: "strong", name: "Strong", type: "normal", power: 90, accuracy: 1, maxPp: 5, currentPp: 0 },
        { id: "weak", name: "Weak", type: "normal", power: 30, accuracy: 1, maxPp: 35, currentPp: 10 }
      ]
    };
    const defender = {
      ...makePokemon(),
      currentHp: 100,
      status: null
    };

    expect(chooseBestMove(attacker, defender).id).toBe("weak");
  });
});

describe("resolveTurn", () => {
  it("resolves turn order by speed", () => {
    const playerTemplate = makePokemon({ id: "p", name: "Playermon", stats: { hp: 100, attack: 70, defense: 70, speed: 90 } });
    const opponentTemplate = makePokemon({ id: "o", name: "Opponentmon", stats: { hp: 100, attack: 70, defense: 70, speed: 30 } });

    const state = createBattle(playerTemplate, opponentTemplate);
    const next = resolveTurn(state, { moveId: "tackle" }, sequenceRng(0, 0, 0, 0, 0, 0));

    const firstTurnMessage = next.log.find((entry) => entry.turn === 1)?.message ?? "";
    expect(firstTurnMessage.startsWith("Playermon used")).toBe(true);
  });

  it("applies status and end-turn damage", () => {
    const playerTemplate = makePokemon({
      id: "p",
      name: "Playermon",
      moves: [
        {
          id: "toxic-flare",
          name: "Toxic Flare",
          type: "fire",
          power: 20,
          accuracy: 1,
          inflictStatus: {
            kind: "poison",
            chance: 1,
            turns: 2
          }
        }
      ]
    });

    const opponentTemplate = makePokemon({ id: "o", name: "Opponentmon", types: ["grass"], stats: { hp: 80, attack: 65, defense: 55, speed: 20 } });

    const state = createBattle(playerTemplate, opponentTemplate);
    const next = resolveTurn(state, { moveId: "toxic-flare" }, sequenceRng(0, 0, 0, 0, 0, 0));

    expect(next.opponent.status?.kind).toBe("poison");
    expect(next.opponent.currentHp).toBeLessThan(80);
    expect(next.log.some((event) => event.message.includes("takes") && event.message.includes("poison"))).toBe(true);
  });

  it("declares winner when a pokemon faints", () => {
    const playerTemplate = makePokemon({
      id: "p",
      name: "Playermon",
      stats: { hp: 100, attack: 130, defense: 70, speed: 90 },
      moves: [{ id: "blast", name: "Blast", type: "fire", power: 120, accuracy: 1 }]
    });

    const opponentTemplate = makePokemon({
      id: "o",
      name: "Opponentmon",
      types: ["grass"],
      stats: { hp: 60, attack: 50, defense: 40, speed: 20 },
      moves: [{ id: "tap", name: "Tap", type: "normal", power: 10, accuracy: 1 }]
    });

    const state = createBattle(playerTemplate, opponentTemplate);
    const next = resolveTurn(state, { moveId: "blast" }, sequenceRng(0, 0));

    expect(next.winner).toBe("player");
    expect(next.log.some((event) => event.message.includes("fainted"))).toBe(true);
  });

  it("consumes move PP when used", () => {
    const playerTemplate = makePokemon({
      id: "p",
      name: "Playermon",
      moves: [{ id: "jab", name: "Jab", type: "normal", power: 40, accuracy: 1, maxPp: 2 }]
    });
    const opponentTemplate = makePokemon({
      id: "o",
      name: "Opponentmon",
      moves: [{ id: "tap", name: "Tap", type: "normal", power: 20, accuracy: 1, maxPp: 20 }]
    });

    const state = createBattle(playerTemplate, opponentTemplate);
    const next = resolveTurn(state, { moveId: "jab" }, sequenceRng(0, 0, 0, 0));
    expect(next.player.moves.find((move) => move.id === "jab")?.currentPp).toBe(1);
  });

  it("logs no-pp message and skips damage from exhausted move", () => {
    const playerTemplate = makePokemon({
      id: "p",
      name: "Playermon",
      moves: [{ id: "empty", name: "Empty", type: "normal", power: 90, accuracy: 1, maxPp: 1, currentPp: 0 }]
    });
    const opponentTemplate = makePokemon({
      id: "o",
      name: "Opponentmon",
      stats: { hp: 100, attack: 70, defense: 70, speed: 10 },
      moves: [{ id: "tap", name: "Tap", type: "normal", power: 1, accuracy: 1 }]
    });

    const state = createBattle(playerTemplate, opponentTemplate);
    const next = resolveTurn(state, { moveId: "empty" }, sequenceRng(0, 0, 0, 0));

    expect(next.log.some((event) => event.message.includes("no PP left"))).toBe(true);
    expect(next.opponent.currentHp).toBe(100);
  });

  it("supports v2 shield behavior and absorbs part of incoming damage", () => {
    const playerTemplate = makePokemon({
      id: "p",
      name: "Playermon",
      moves: [
        {
          id: "guard",
          name: "Guard Pulse",
          type: "psychic",
          power: 40,
          accuracy: 1,
          behaviorVersion: "v2",
          behaviorProgram: {
            version: "2",
            steps: [
              { type: "apply_shield_until_threshold", thresholdDamage: 30, turns: 2 },
              { type: "base_attack" }
            ]
          }
        }
      ]
    });

    const opponentTemplate = makePokemon({
      id: "o",
      name: "Opponentmon",
      moves: [{ id: "blast", name: "Blast", type: "fire", power: 100, accuracy: 1 }]
    });

    const initial = createBattle(playerTemplate, opponentTemplate);
    const next = resolveTurn(initial, { moveId: "guard" }, sequenceRng(0, 0, 0, 0, 0, 0));
    expect(next.log.some((event) => event.message.includes("shield absorbed"))).toBe(true);
  });

  it("supports v2 ramp behavior that gets stronger with repeated use", () => {
    const playerTemplate = makePokemon({
      id: "p",
      name: "Playermon",
      moves: [
        {
          id: "focus-ramp",
          name: "Focus Ramp",
          type: "fire",
          power: 40,
          accuracy: 1,
          behaviorVersion: "v2",
          behaviorProgram: {
            version: "2",
            steps: [{ type: "ramp_power_by_use_count", gain: 0.1, minMultiplier: 1, maxMultiplier: 1.9 }]
          }
        }
      ]
    });
    const opponentTemplate = makePokemon({
      id: "o",
      name: "Opponentmon",
      stats: { hp: 220, attack: 40, defense: 70, speed: 20 },
      moves: [{ id: "tap", name: "Tap", type: "normal", power: 1, accuracy: 1 }]
    });

    const first = resolveTurn(createBattle(playerTemplate, opponentTemplate), { moveId: "focus-ramp" }, sequenceRng(0, 0, 0, 0));
    const second = resolveTurn(first, { moveId: "focus-ramp" }, sequenceRng(0, 0, 0, 0));

    const firstDamage = Math.max(0, opponentTemplate.stats.hp - first.opponent.currentHp);
    const secondDamage = Math.max(0, first.opponent.currentHp - second.opponent.currentHp);

    expect(secondDamage).toBeGreaterThan(firstDamage);
  });
});
