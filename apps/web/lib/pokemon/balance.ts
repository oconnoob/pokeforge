import { createBattle, resolveTurn, chooseBestMove, type BattleMove } from "@pokeforge/battle-engine";
import { BUILTIN_POKEMON_CATALOG, toBattleTemplate } from "@/lib/pokemon/catalog";
import { type PokemonDraft } from "@/lib/pokemon/validator";

export interface BalanceReport {
  staticScore: number;
  simulation: {
    matches: number;
    wins: number;
    losses: number;
    winRate: number;
    medianTurns: number;
    oneTurnKoRate: number;
    avgDamagePerTurn: number;
  };
  thresholds: {
    minWinRate: number;
    maxWinRate: number;
    minMedianTurns: number;
    maxOneTurnKoRate: number;
    maxAvgDamagePerTurn: number;
  };
}

export interface BalanceValidationResult {
  passed: boolean;
  reasons: string[];
  report: BalanceReport;
}

const MIN_WIN_RATE = 0.35;
const MAX_WIN_RATE = 0.65;
const MIN_MEDIAN_TURNS = 3;
const MAX_ONE_TURN_KO_RATE = 0.08;
const MAX_AVG_DAMAGE_PER_TURN = 38;
const MAX_STATIC_SCORE = 360;

const lcg = (seed: number) => {
  let current = seed >>> 0;
  return () => {
    current = (1664525 * current + 1013904223) >>> 0;
    return current / 0xffffffff;
  };
};

const scoreMove = (move: BattleMove): number => {
  const base = move.power * move.accuracy;
  const behaviorSteps = move.behaviorProgram?.steps ?? [];

  let behaviorScore = 0;
  for (const step of behaviorSteps) {
    switch (step.type) {
      case "base_attack":
        behaviorScore += 4;
        break;
      case "ramp_power_by_use_count":
        behaviorScore += 16 + step.gain * 80;
        break;
      case "apply_status":
        behaviorScore += step.chance * step.turns * 20;
        break;
      case "apply_decaying_dot":
        behaviorScore += step.startPctMaxHp * 120 + step.turns * 3;
        break;
      case "apply_shield_until_threshold":
        behaviorScore += step.thresholdDamage * 0.22;
        break;
      case "heal_self":
        behaviorScore += step.amountPctMaxHp * 90;
        break;
      case "modify_stat_temp":
        behaviorScore += Math.abs(step.deltaPct) * step.turns * 30;
        break;
      case "reflect_portion_next_hit":
        behaviorScore += step.ratio * 30 + step.maxDamage * 0.12;
        break;
      case "cleanse_self_status":
        behaviorScore += 8;
        break;
      default:
        break;
    }
  }

  return base + behaviorScore;
};

const median = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

interface SimulationOutcome {
  turns: number;
  winner: "player" | "opponent";
  oneTurnKo: boolean;
  totalDamageByPlayer: number;
}

const runOneSimulation = (
  playerTemplate: ReturnType<typeof toBattleTemplate>,
  opponentTemplate: ReturnType<typeof toBattleTemplate>,
  seed: number,
  candidateOnPlayerSide: boolean
): SimulationOutcome => {
  const random = lcg(seed);
  let state = createBattle(playerTemplate, opponentTemplate);
  const playerStartingHp = playerTemplate.stats.hp;
  const opponentStartingHp = opponentTemplate.stats.hp;

  for (let step = 0; step < 40 && !state.winner; step += 1) {
    const playerMove = chooseBestMove(state.player, state.opponent, random);
    state = resolveTurn(state, { moveId: playerMove.id }, random);
  }

  const turns = Math.max(1, state.turn - 1);
  const totalDamageByPlayer = candidateOnPlayerSide
    ? Math.max(0, opponentStartingHp - state.opponent.currentHp)
    : Math.max(0, playerStartingHp - state.player.currentHp);
  const winner =
    state.winner === "player"
      ? candidateOnPlayerSide
        ? "player"
        : "opponent"
      : candidateOnPlayerSide
        ? "opponent"
        : "player";

  return {
    turns,
    winner,
    oneTurnKo: winner === "player" && turns <= 1,
    totalDamageByPlayer
  };
};

export const validateBalance = (draft: PokemonDraft): BalanceValidationResult => {
  const staticScore = draft.moves.reduce((sum, move) => sum + scoreMove(move), 0);

  const candidateTemplate = toBattleTemplate({
    id: "candidate",
    name: draft.name,
    sourceType: "generated",
    primaryType: draft.primaryType,
    secondaryType: draft.secondaryType,
    hp: draft.stats.hp,
    attack: draft.stats.attack,
    defense: draft.stats.defense,
    speed: draft.stats.speed,
    frontSprite: "/sprites/placeholder_front.png",
    backSprite: "/sprites/placeholder_back.png",
    moves: draft.moves
  });

  const outcomes: SimulationOutcome[] = [];
  let seedBase = 1337;

  for (const builtin of BUILTIN_POKEMON_CATALOG) {
    const builtinTemplate = toBattleTemplate(builtin);
    for (let i = 0; i < 10; i += 1) {
      outcomes.push(runOneSimulation(candidateTemplate, builtinTemplate, seedBase++, true));
      outcomes.push(runOneSimulation(builtinTemplate, candidateTemplate, seedBase++, false));
    }
  }

  const matches = outcomes.length;
  const wins = outcomes.filter((entry) => entry.winner === "player").length;
  const losses = matches - wins;
  const winRate = matches > 0 ? wins / matches : 0;
  const medianTurns = median(outcomes.map((entry) => entry.turns));
  const oneTurnKoRate = matches > 0 ? outcomes.filter((entry) => entry.oneTurnKo).length / matches : 0;
  const avgDamagePerTurn =
    matches > 0
      ? outcomes.reduce((sum, entry) => sum + entry.totalDamageByPlayer / Math.max(1, entry.turns), 0) / matches
      : 0;

  const report: BalanceReport = {
    staticScore,
    simulation: {
      matches,
      wins,
      losses,
      winRate,
      medianTurns,
      oneTurnKoRate,
      avgDamagePerTurn
    },
    thresholds: {
      minWinRate: MIN_WIN_RATE,
      maxWinRate: MAX_WIN_RATE,
      minMedianTurns: MIN_MEDIAN_TURNS,
      maxOneTurnKoRate: MAX_ONE_TURN_KO_RATE,
      maxAvgDamagePerTurn: MAX_AVG_DAMAGE_PER_TURN
    }
  };

  const reasons: string[] = [];
  if (staticScore > MAX_STATIC_SCORE) {
    reasons.push(`MOVE_BUDGET_EXCEEDED: static score ${staticScore.toFixed(1)} exceeds ${MAX_STATIC_SCORE}.`);
  }
  if (winRate < MIN_WIN_RATE || winRate > MAX_WIN_RATE) {
    reasons.push(`SIMULATION_BALANCE_FAILED: win rate ${Math.round(winRate * 100)}% is outside ${Math.round(MIN_WIN_RATE * 100)}-${Math.round(MAX_WIN_RATE * 100)}%.`);
  }
  if (medianTurns < MIN_MEDIAN_TURNS) {
    reasons.push(`SIMULATION_BALANCE_FAILED: median turns ${medianTurns.toFixed(1)} is below ${MIN_MEDIAN_TURNS}.`);
  }
  if (oneTurnKoRate > MAX_ONE_TURN_KO_RATE) {
    reasons.push(`SIMULATION_BALANCE_FAILED: one-turn KO rate ${Math.round(oneTurnKoRate * 100)}% exceeds ${Math.round(MAX_ONE_TURN_KO_RATE * 100)}%.`);
  }
  if (avgDamagePerTurn > MAX_AVG_DAMAGE_PER_TURN) {
    reasons.push(`SIMULATION_BALANCE_FAILED: avg damage/turn ${avgDamagePerTurn.toFixed(1)} exceeds ${MAX_AVG_DAMAGE_PER_TURN}.`);
  }

  return {
    passed: reasons.length === 0,
    reasons,
    report
  };
};
