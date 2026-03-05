export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "grass"
  | "electric"
  | "rock"
  | "ground"
  | "ice"
  | "fighting"
  | "psychic";

export type StatusKind = "burn" | "poison";

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface StatusCondition {
  kind: StatusKind;
  remainingTurns: number;
}

export interface StatusEffectMovePayload {
  kind: StatusKind;
  chance: number;
  turns: number;
}

export interface BattleMove {
  id: string;
  name: string;
  type: PokemonType;
  power: number;
  accuracy: number;
  maxPp?: number;
  currentPp?: number;
  priority?: number;
  inflictStatus?: StatusEffectMovePayload;
}

export interface BattlePokemonTemplate {
  id: string;
  name: string;
  types: PokemonType[];
  stats: PokemonStats;
  moves: BattleMove[];
}

export interface BattleCombatant extends BattlePokemonTemplate {
  currentHp: number;
  status: StatusCondition | null;
}

export type BattleSide = "player" | "opponent";

export interface BattleLogEvent {
  turn: number;
  message: string;
}

export interface BattleState {
  turn: number;
  player: BattleCombatant;
  opponent: BattleCombatant;
  winner: BattleSide | null;
  log: BattleLogEvent[];
}

export interface BattleAction {
  moveId: string;
}

export type RandomSource = () => number;

const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  normal: { rock: 0.5 },
  fire: { grass: 2, water: 0.5, fire: 0.5, rock: 0.5, ice: 2 },
  water: { fire: 2, grass: 0.5, water: 0.5, rock: 2, ground: 2 },
  grass: { water: 2, fire: 0.5, grass: 0.5, rock: 2, ground: 2, ice: 0.5 },
  electric: { water: 2, grass: 0.5, ground: 0, electric: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5 },
  ground: { fire: 2, electric: 2, grass: 0.5, rock: 2 },
  ice: { grass: 2, water: 0.5, fire: 0.5, ground: 2 },
  fighting: { rock: 2, psychic: 0.5, ice: 2, normal: 2 },
  psychic: { fighting: 2, psychic: 0.5 }
};

const cloneCombatant = (template: BattlePokemonTemplate): BattleCombatant => ({
  ...template,
  currentHp: template.stats.hp,
  status: null,
  moves: template.moves.map((move) => {
    const normalizedMaxPp = Math.max(1, Math.floor(move.maxPp ?? move.currentPp ?? 20));
    return {
      ...move,
      maxPp: normalizedMaxPp,
      currentPp: Math.max(0, Math.min(normalizedMaxPp, Math.floor(move.currentPp ?? normalizedMaxPp)))
    };
  })
});

export const calculateTypeEffectiveness = (moveType: PokemonType, defenderTypes: PokemonType[]): number =>
  defenderTypes.reduce((multiplier, defenderType) => {
    const modifier = TYPE_CHART[moveType][defenderType] ?? 1;
    return multiplier * modifier;
  }, 1);

export const calculateBaseDamage = (
  attacker: BattleCombatant,
  defender: BattleCombatant,
  move: BattleMove,
  random: RandomSource = Math.random
): number => {
  const stab = attacker.types.includes(move.type) ? 1.15 : 1;
  const typeEffectiveness = calculateTypeEffectiveness(move.type, defender.types);

  if (typeEffectiveness === 0) {
    return 0;
  }

  const burnPenalty = attacker.status?.kind === "burn" ? 0.8 : 1;
  const variance = 0.9 + random() * 0.1;
  const offenseRatio = attacker.stats.attack / Math.max(1, defender.stats.defense);
  const scaledBase = (move.power * offenseRatio) / 3 + 2;
  const raw = scaledBase * stab;
  const damage = Math.floor(raw * typeEffectiveness * burnPenalty * variance);

  return Math.max(1, damage);
};

const findMove = (combatant: BattleCombatant, moveId: string): BattleMove =>
  combatant.moves.find((move) => move.id === moveId) ?? combatant.moves[0];

const pushLog = (state: BattleState, message: string) => {
  state.log.push({ turn: state.turn, message });
};

const applyStatusDamage = (state: BattleState, side: BattleSide) => {
  const combatant = state[side];
  if (!combatant.status) {
    return;
  }

  const status = combatant.status;
  const damage = Math.max(1, Math.floor(combatant.stats.hp / 8));
  combatant.currentHp = Math.max(0, combatant.currentHp - damage);
  pushLog(state, `${combatant.name} takes ${damage} damage from ${status.kind}.`);

  status.remainingTurns -= 1;
  if (status.remainingTurns <= 0) {
    combatant.status = null;
    pushLog(state, `${combatant.name} is no longer affected by status.`);
  }
};

const maybeDeclareWinner = (state: BattleState): boolean => {
  if (state.player.currentHp <= 0 && state.opponent.currentHp <= 0) {
    state.winner = "player";
    pushLog(state, "Both Pokemon fainted. Player wins on tie-break.");
    return true;
  }

  if (state.opponent.currentHp <= 0) {
    state.winner = "player";
    pushLog(state, `${state.opponent.name} fainted. You win.`);
    return true;
  }

  if (state.player.currentHp <= 0) {
    state.winner = "opponent";
    pushLog(state, `${state.player.name} fainted. Opponent wins.`);
    return true;
  }

  return false;
};

const applyMove = (
  state: BattleState,
  attackerSide: BattleSide,
  defenderSide: BattleSide,
  move: BattleMove,
  random: RandomSource
) => {
  const attacker = state[attackerSide];
  const defender = state[defenderSide];

  if (attacker.currentHp <= 0) {
    return;
  }

  const availablePp = move.currentPp ?? move.maxPp ?? 20;
  if (availablePp <= 0) {
    pushLog(state, `${attacker.name} tried ${move.name}, but it has no PP left.`);
    return;
  }

  move.currentPp = Math.max(0, availablePp - 1);

  if (random() > move.accuracy) {
    pushLog(state, `${attacker.name}'s ${move.name} missed.`);
    return;
  }

  const damage = calculateBaseDamage(attacker, defender, move, random);
  defender.currentHp = Math.max(0, defender.currentHp - damage);

  const typeEffectiveness = calculateTypeEffectiveness(move.type, defender.types);
  const effectMessage =
    typeEffectiveness > 1
      ? " It's super effective."
      : typeEffectiveness < 1
        ? " It's not very effective."
        : "";

  pushLog(
    state,
    `${attacker.name} used ${move.name} for ${damage} damage.${effectMessage} (${defender.name}: ${defender.currentHp}/${defender.stats.hp})`
  );

  if (move.inflictStatus && !defender.status && defender.currentHp > 0 && random() <= move.inflictStatus.chance) {
    defender.status = {
      kind: move.inflictStatus.kind,
      remainingTurns: move.inflictStatus.turns
    };
    pushLog(state, `${defender.name} is now ${move.inflictStatus.kind}.`);
  }
};

const comparePriority = (
  first: { side: BattleSide; move: BattleMove },
  second: { side: BattleSide; move: BattleMove },
  state: BattleState
): number => {
  const firstPriority = first.move.priority ?? 0;
  const secondPriority = second.move.priority ?? 0;

  if (firstPriority !== secondPriority) {
    return secondPriority - firstPriority;
  }

  const firstSpeed = state[first.side].stats.speed;
  const secondSpeed = state[second.side].stats.speed;

  if (firstSpeed !== secondSpeed) {
    return secondSpeed - firstSpeed;
  }

  return first.side === "player" ? -1 : 1;
};

const evaluateMoveScore = (attacker: BattleCombatant, defender: BattleCombatant, move: BattleMove): number => {
  const availablePp = move.currentPp ?? move.maxPp ?? 20;
  if (availablePp <= 0) {
    return Number.NEGATIVE_INFINITY;
  }

  const typeMultiplier = calculateTypeEffectiveness(move.type, defender.types);
  const stab = attacker.types.includes(move.type) ? 1.2 : 1;
  const expectedDamage = move.power * move.accuracy * typeMultiplier * stab;
  const likelyDamage = move.power * typeMultiplier * stab;
  const finishingBonus = likelyDamage >= defender.currentHp ? 28 : 0;
  const statusBonus = move.inflictStatus && !defender.status ? 12 * move.inflictStatus.chance : 0;
  const accuracyPenalty = (1 - move.accuracy) * 18;
  const priorityBonus = (move.priority ?? 0) * 8;
  return expectedDamage + finishingBonus + statusBonus + priorityBonus - accuracyPenalty;
};

export const chooseBestMove = (
  attacker: BattleCombatant,
  defender: BattleCombatant,
  random?: RandomSource
): BattleMove => {
  const scoredMoves = attacker.moves
    .map((move) => ({
      move,
      score: evaluateMoveScore(attacker, defender, move)
    }))
    .sort((a, b) => b.score - a.score);

  const primary = scoredMoves[0];
  const alternative = scoredMoves[1];
  if (!primary) {
    return attacker.moves[0];
  }
  if (!Number.isFinite(primary.score)) {
    return primary.move;
  }
  if (!alternative || !random) {
    return primary.move;
  }

  // Add light variety: occasionally choose an alternative if it's close in score.
  const scoreGap = primary.score - alternative.score;
  if (scoreGap <= 10 && random() < 0.24) {
    return alternative.move;
  }

  return primary.move;
};

export const createBattle = (
  playerTemplate: BattlePokemonTemplate,
  opponentTemplate: BattlePokemonTemplate
): BattleState => ({
  turn: 1,
  player: cloneCombatant(playerTemplate),
  opponent: cloneCombatant(opponentTemplate),
  winner: null,
  log: [
    {
      turn: 0,
      message: `${playerTemplate.name} challenges ${opponentTemplate.name}.`
    }
  ]
});

export const resolveTurn = (
  previousState: BattleState,
  playerAction: BattleAction,
  random: RandomSource = Math.random
): BattleState => {
  if (previousState.winner) {
    return previousState;
  }

  const state: BattleState = {
    ...previousState,
    player: { ...previousState.player, moves: previousState.player.moves.map((move) => ({ ...move })) },
    opponent: { ...previousState.opponent, moves: previousState.opponent.moves.map((move) => ({ ...move })) },
    log: [...previousState.log]
  };

  const playerMove = findMove(state.player, playerAction.moveId);
  const opponentMove = chooseBestMove(state.opponent, state.player, random);

  const actions: Array<{ side: BattleSide; move: BattleMove }> = [
    { side: "player", move: playerMove },
    { side: "opponent", move: opponentMove }
  ];

  actions.sort((a, b) => comparePriority(a, b, state));

  for (const action of actions) {
    const attackerSide = action.side;
    const defenderSide = attackerSide === "player" ? "opponent" : "player";
    applyMove(state, attackerSide, defenderSide, action.move, random);

    if (maybeDeclareWinner(state)) {
      return state;
    }
  }

  applyStatusDamage(state, "player");
  applyStatusDamage(state, "opponent");

  maybeDeclareWinner(state);

  state.turn += 1;
  return state;
};
