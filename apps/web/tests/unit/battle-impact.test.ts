import { describe, expect, it } from "vitest";
import { parseImpactCue, parseUsedMoveCue } from "@/lib/battle/impact";

describe("parseImpactCue", () => {
  it("parses neutral damage lines", () => {
    expect(parseImpactCue("Pikachu used Tackle for 18 damage. (Squirtle: 40/58)")).toEqual({
      target: "Squirtle",
      damage: 18,
      remainingHp: 40,
      maxHp: 58,
      effectiveness: "neutral"
    });
  });

  it("parses super effective and resisted lines", () => {
    expect(parseImpactCue("Pikachu used Volt Tackle for 52 damage. It's super effective. (Gyarados: 70/122)")).toEqual({
      target: "Gyarados",
      damage: 52,
      remainingHp: 70,
      maxHp: 122,
      effectiveness: "super"
    });
    expect(parseImpactCue("Vaporeon used Water Pulse for 12 damage. It's not very effective. (Bulbasaur: 66/92)")).toEqual({
      target: "Bulbasaur",
      damage: 12,
      remainingHp: 66,
      maxHp: 92,
      effectiveness: "resist"
    });
  });

  it("returns null for non-damage lines", () => {
    expect(parseImpactCue("Pikachu's Thunder missed.")).toBeNull();
    expect(parseImpactCue("Gyarados fainted. You win.")).toBeNull();
  });
});

describe("parseUsedMoveCue", () => {
  it("extracts attacker and move name from damage line", () => {
    expect(parseUsedMoveCue("Pikachu used Volt Tackle for 52 damage. It's super effective. (Gyarados: 70/122)")).toEqual({
      attacker: "Pikachu",
      moveName: "Volt Tackle"
    });
  });

  it("returns null for non-damage lines", () => {
    expect(parseUsedMoveCue("Pikachu's Thunder missed.")).toBeNull();
  });
});
