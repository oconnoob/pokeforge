import { describe, expect, it } from "vitest";
import {
  extractNewLogMessages,
  effectivenessHint,
  hpBarZone,
  statusBadgeLabel,
  typeToEffectClass,
  winnerBannerText
} from "@/lib/battle/presentation";

describe("extractNewLogMessages", () => {
  it("returns only newly appended log messages", () => {
    const previous = {
      log: [
        { turn: 0, message: "A wild fight started." },
        { turn: 1, message: "Pikachu used Thunderbolt." }
      ]
    };
    const next = {
      log: [
        { turn: 0, message: "A wild fight started." },
        { turn: 1, message: "Pikachu used Thunderbolt." },
        { turn: 1, message: "Squirtle took 20 damage." },
        { turn: 1, message: "Squirtle used Tackle." }
      ]
    };

    expect(extractNewLogMessages(previous, next)).toEqual(["Squirtle took 20 damage.", "Squirtle used Tackle."]);
  });
});

describe("hpBarZone", () => {
  it("maps hp percent to high/mid/low zone", () => {
    expect(hpBarZone(90, 100)).toBe("high");
    expect(hpBarZone(45, 100)).toBe("mid");
    expect(hpBarZone(10, 100)).toBe("low");
  });
});

describe("typeToEffectClass", () => {
  it("maps known types and defaults to neutral", () => {
    expect(typeToEffectClass("fire")).toBe("battle-fx-fire");
    expect(typeToEffectClass("water")).toBe("battle-fx-water");
    expect(typeToEffectClass("electric")).toBe("battle-fx-electric");
    expect(typeToEffectClass("unknown")).toBe("battle-fx-neutral");
  });
});

describe("winnerBannerText", () => {
  it("maps winner side to banner copy", () => {
    expect(winnerBannerText("player")).toBe("Victory!");
    expect(winnerBannerText("opponent")).toBe("Defeat");
    expect(winnerBannerText(null)).toBe("");
  });
});

describe("statusBadgeLabel", () => {
  it("maps status kinds to compact battle labels", () => {
    expect(statusBadgeLabel("burn")).toBe("BRN");
    expect(statusBadgeLabel("poison")).toBe("PSN");
    expect(statusBadgeLabel(null)).toBe("");
  });
});

describe("effectivenessHint", () => {
  it("maps multiplier ranges to tactical labels", () => {
    expect(effectivenessHint(0)).toBe("No effect");
    expect(effectivenessHint(2)).toBe("Super effective");
    expect(effectivenessHint(0.5)).toBe("Not very effective");
    expect(effectivenessHint(1)).toBe("Neutral");
  });
});
