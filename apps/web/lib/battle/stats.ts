import type { BattleLogEvent } from "@pokeforge/battle-engine";
import { parseImpactCue, parseUsedMoveCue } from "@/lib/battle/impact";

export interface BattleStatsSummary {
  turnsCompleted: number;
  playerDamageDealt: number;
  playerDamageTaken: number;
  playerLastMove: string | null;
  opponentLastMove: string | null;
}

export interface BattleTimelineEntry {
  key: string;
  turnLabel: string;
  message: string;
  actor: "player" | "opponent" | "system";
  eventType: "action" | "status" | "faint" | "system";
}

export const timelineActorLabel = (actor: BattleTimelineEntry["actor"]): string => {
  if (actor === "player") {
    return "YOU";
  }
  if (actor === "opponent") {
    return "CPU";
  }
  return "SYS";
};

export const summarizeBattleLog = (
  log: BattleLogEvent[],
  playerName: string,
  opponentName: string,
  currentTurn: number
): BattleStatsSummary => {
  let playerDamageDealt = 0;
  let playerDamageTaken = 0;
  let playerLastMove: string | null = null;
  let opponentLastMove: string | null = null;

  const normalizedPlayer = playerName.toLowerCase();
  const normalizedOpponent = opponentName.toLowerCase();

  for (const entry of log) {
    const usedMove = parseUsedMoveCue(entry.message);
    const impact = parseImpactCue(entry.message);
    if (!usedMove || !impact) {
      continue;
    }

    const attacker = usedMove.attacker.toLowerCase();
    if (attacker === normalizedPlayer) {
      playerDamageDealt += impact.damage;
      playerLastMove = usedMove.moveName;
      continue;
    }

    if (attacker === normalizedOpponent) {
      playerDamageTaken += impact.damage;
      opponentLastMove = usedMove.moveName;
    }
  }

  return {
    turnsCompleted: Math.max(0, currentTurn - 1),
    playerDamageDealt,
    playerDamageTaken,
    playerLastMove,
    opponentLastMove
  };
};

const inferTimelineActor = (message: string, playerName: string, opponentName: string): "player" | "opponent" | "system" => {
  const normalized = message.toLowerCase();
  const playerLower = playerName.toLowerCase();
  const opponentLower = opponentName.toLowerCase();

  const usedMove = parseUsedMoveCue(message);
  if (usedMove) {
    const attacker = usedMove.attacker.toLowerCase();
    if (attacker === playerLower) {
      return "player";
    }
    if (attacker === opponentLower) {
      return "opponent";
    }
  }

  if (normalized.includes(playerLower)) {
    return "player";
  }
  if (normalized.includes(opponentLower)) {
    return "opponent";
  }
  return "system";
};

const inferTimelineEventType = (message: string): "action" | "status" | "faint" | "system" => {
  const normalized = message.toLowerCase();
  if (parseUsedMoveCue(message)) {
    return "action";
  }
  if (normalized.includes("fainted")) {
    return "faint";
  }
  if (normalized.includes("is now ") || normalized.includes("takes ") || normalized.includes("status")) {
    return "status";
  }
  return "system";
};

export const buildBattleTimeline = (
  log: BattleLogEvent[],
  playerName: string,
  opponentName: string,
  limit = 8
): BattleTimelineEntry[] =>
  log
    .slice(-Math.max(1, limit))
    .map((entry, index) => ({
      key: `${entry.turn}-${index}-${entry.message.slice(0, 18)}`,
      turnLabel: `T${entry.turn}`,
      message: entry.message,
      actor: inferTimelineActor(entry.message, playerName, opponentName),
      eventType: inferTimelineEventType(entry.message)
    }))
    .reverse();
