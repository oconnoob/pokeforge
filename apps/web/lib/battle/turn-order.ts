import { chooseBestMove, type BattleCombatant, type BattleMove, type BattleSide } from "@pokeforge/battle-engine";

export interface TurnOrderPrediction {
  firstActor: BattleSide;
  reason: string;
}

const movePriority = (move: BattleMove): number => move.priority ?? 0;

export const predictFirstActor = (
  player: BattleCombatant,
  opponent: BattleCombatant,
  playerMove: BattleMove
): TurnOrderPrediction => {
  const opponentMove = chooseBestMove(opponent, player);
  const playerPriority = movePriority(playerMove);
  const opponentPriority = movePriority(opponentMove);

  if (playerPriority > opponentPriority) {
    return {
      firstActor: "player",
      reason: "You move first (higher priority)"
    };
  }

  if (opponentPriority > playerPriority) {
    return {
      firstActor: "opponent",
      reason: "Opponent moves first (higher priority)"
    };
  }

  if (player.stats.speed > opponent.stats.speed) {
    return {
      firstActor: "player",
      reason: "You move first (higher speed)"
    };
  }

  if (opponent.stats.speed > player.stats.speed) {
    return {
      firstActor: "opponent",
      reason: "Opponent moves first (higher speed)"
    };
  }

  return {
    firstActor: "player",
    reason: "Speed tie: you move first"
  };
};
