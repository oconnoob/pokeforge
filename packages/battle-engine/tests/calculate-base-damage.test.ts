import { describe, expect, it } from "vitest";
import { calculateBaseDamage, type BattlePokemon } from "../src/index";

const makePokemon = (id: string, attack: number, defense: number): BattlePokemon => ({
  id,
  name: id,
  stats: {
    hp: 100,
    attack,
    defense,
    speed: 50
  }
});

describe("calculateBaseDamage", () => {
  it("returns at least 1", () => {
    const attacker = makePokemon("a", 10, 10);
    const defender = makePokemon("d", 20, 100);

    expect(calculateBaseDamage(attacker, defender)).toBe(1);
  });

  it("scales with attacker and defender stats", () => {
    const attacker = makePokemon("a", 50, 10);
    const defender = makePokemon("d", 20, 20);

    expect(calculateBaseDamage(attacker, defender)).toBe(40);
  });
});
