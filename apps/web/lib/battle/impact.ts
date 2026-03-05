export interface BattleImpactCue {
  target: string;
  damage: number;
  remainingHp: number;
  maxHp: number;
  effectiveness: "super" | "resist" | "neutral";
}

export interface UsedMoveCue {
  attacker: string;
  moveName: string;
}

const DAMAGE_LINE_PATTERN =
  /^(.+?) used .+? for (\d+) damage\.(?: It's (super effective|not very effective)\.)? \((.+?): (\d+)\/(\d+)\)$/i;
const USED_MOVE_PATTERN = /^(.+?) used (.+?) for \d+ damage\./i;

export const parseImpactCue = (message: string): BattleImpactCue | null => {
  const match = DAMAGE_LINE_PATTERN.exec(message.trim());
  if (!match) {
    return null;
  }

  const damage = Number.parseInt(match[2] ?? "0", 10);
  if (!Number.isFinite(damage) || damage <= 0) {
    return null;
  }

  const effectivenessToken = (match[3] ?? "").toLowerCase();
  const effectiveness =
    effectivenessToken === "super effective"
      ? "super"
      : effectivenessToken === "not very effective"
        ? "resist"
        : "neutral";
  const remainingHp = Number.parseInt(match[5] ?? "0", 10);
  const maxHp = Number.parseInt(match[6] ?? "0", 10);

  return {
    target: (match[4] ?? "").trim(),
    damage,
    remainingHp: Number.isFinite(remainingHp) ? remainingHp : 0,
    maxHp: Number.isFinite(maxHp) ? maxHp : 0,
    effectiveness
  };
};

export const parseUsedMoveCue = (message: string): UsedMoveCue | null => {
  const match = USED_MOVE_PATTERN.exec(message.trim());
  if (!match) {
    return null;
  }

  return {
    attacker: (match[1] ?? "").trim(),
    moveName: (match[2] ?? "").trim()
  };
};
