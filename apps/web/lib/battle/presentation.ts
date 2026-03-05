interface BattleLogLike {
  log: Array<{ message: string }>;
}

type WinnerSide = "player" | "opponent" | null;
type StatusKind = "burn" | "poison" | null;

export const extractNewLogMessages = (previous: BattleLogLike, next: BattleLogLike): string[] =>
  next.log.slice(previous.log.length).map((entry) => entry.message);

export const hpBarZone = (currentHp: number, totalHp: number): "high" | "mid" | "low" => {
  if (totalHp <= 0) {
    return "low";
  }

  const percent = (currentHp / totalHp) * 100;
  if (percent > 50) {
    return "high";
  }
  if (percent > 20) {
    return "mid";
  }
  return "low";
};

export const typeToEffectClass = (type: string): string => {
  switch (type) {
    case "fire":
      return "battle-fx-fire";
    case "water":
      return "battle-fx-water";
    case "electric":
      return "battle-fx-electric";
    case "grass":
      return "battle-fx-grass";
    case "psychic":
      return "battle-fx-psychic";
    case "ice":
      return "battle-fx-ice";
    case "rock":
    case "ground":
      return "battle-fx-impact";
    default:
      return "battle-fx-neutral";
  }
};

export const winnerBannerText = (winner: WinnerSide): string => {
  if (winner === "player") {
    return "Victory!";
  }
  if (winner === "opponent") {
    return "Defeat";
  }
  return "";
};

export const statusBadgeLabel = (status: StatusKind): string => {
  if (status === "burn") {
    return "BRN";
  }
  if (status === "poison") {
    return "PSN";
  }
  return "";
};

export const effectivenessHint = (multiplier: number): string => {
  if (multiplier <= 0) {
    return "No effect";
  }
  if (multiplier > 1) {
    return "Super effective";
  }
  if (multiplier < 1) {
    return "Not very effective";
  }
  return "Neutral";
};
