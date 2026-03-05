import { describe, expect, it } from "vitest";
import { buildBattleTimeline, summarizeBattleLog, timelineActorLabel } from "@/lib/battle/stats";

describe("summarizeBattleLog", () => {
  it("aggregates damage totals and last-move names from damage log lines", () => {
    const summary = summarizeBattleLog(
      [
        { turn: 0, message: "Alpha challenges Beta." },
        { turn: 1, message: "Alpha used Ember for 30 damage. (Beta: 70/100)" },
        { turn: 1, message: "Beta used Tackle for 12 damage. (Alpha: 88/100)" },
        { turn: 2, message: "Alpha used Flame Burst for 28 damage. It's super effective. (Beta: 42/100)" }
      ],
      "Alpha",
      "Beta",
      3
    );

    expect(summary.turnsCompleted).toBe(2);
    expect(summary.playerDamageDealt).toBe(58);
    expect(summary.playerDamageTaken).toBe(12);
    expect(summary.playerLastMove).toBe("Flame Burst");
    expect(summary.opponentLastMove).toBe("Tackle");
  });

  it("ignores non-damage lines", () => {
    const summary = summarizeBattleLog(
      [
        { turn: 1, message: "Alpha's Ember missed." },
        { turn: 1, message: "Beta fainted. You win." }
      ],
      "Alpha",
      "Beta",
      2
    );

    expect(summary.playerDamageDealt).toBe(0);
    expect(summary.playerDamageTaken).toBe(0);
    expect(summary.playerLastMove).toBeNull();
    expect(summary.opponentLastMove).toBeNull();
  });
});

describe("buildBattleTimeline", () => {
  it("creates actor/event metadata and turn labels", () => {
    const timeline = buildBattleTimeline(
      [
        { turn: 0, message: "Alpha challenges Beta." },
        { turn: 1, message: "Alpha used Ember for 30 damage. (Beta: 70/100)" },
        { turn: 1, message: "Beta is now poison." },
        { turn: 1, message: "Beta fainted. You win." }
      ],
      "Alpha",
      "Beta",
      6
    );

    expect(timeline[0]?.turnLabel).toBe("T1");
    expect(timeline[0]?.eventType).toBe("faint");
    expect(timeline[0]?.actor).toBe("opponent");

    expect(timeline[2]?.eventType).toBe("action");
    expect(timeline[2]?.actor).toBe("player");
  });

  it("respects limit and reverse chronological order", () => {
    const timeline = buildBattleTimeline(
      [
        { turn: 0, message: "A" },
        { turn: 1, message: "B" },
        { turn: 2, message: "C" }
      ],
      "Alpha",
      "Beta",
      2
    );

    expect(timeline).toHaveLength(2);
    expect(timeline[0]?.message).toBe("C");
    expect(timeline[1]?.message).toBe("B");
  });
});

describe("timelineActorLabel", () => {
  it("maps actor kinds to compact tags", () => {
    expect(timelineActorLabel("player")).toBe("YOU");
    expect(timelineActorLabel("opponent")).toBe("CPU");
    expect(timelineActorLabel("system")).toBe("SYS");
  });
});
