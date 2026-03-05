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
});
