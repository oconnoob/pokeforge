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

export type BehaviorVariableName =
  | "self.attack"
  | "self.defense"
  | "self.speed"
  | "self.hpPct"
  | "target.attack"
  | "target.defense"
  | "target.speed"
  | "target.hpPct"
  | "move.useCount"
  | "turn";

export type BehaviorExpression =
  | { kind: "const"; value: number }
  | { kind: "var"; name: BehaviorVariableName }
  | {
      kind: "op";
      op: "add" | "sub" | "mul" | "div" | "min" | "max" | "clamp" | "pow";
      args: BehaviorExpression[];
    };

export type BehaviorNumeric = number | BehaviorExpression;

export interface BaseAttackStep {
  type: "base_attack";
  powerMultiplier?: BehaviorNumeric;
}

export interface ApplyStatusStep {
  type: "apply_status";
  target: "opponent" | "self";
  status: StatusKind;
  chance: number;
  turns: number;
}

export interface ApplyDecayingDotStep {
  type: "apply_decaying_dot";
  id: string;
  target: "opponent" | "self";
  chance: number;
  turns: number;
  startPctMaxHp: number;
  decayPctPerTurn: number;
  minPctMaxHp: number;
}

export interface ApplyShieldUntilThresholdStep {
  type: "apply_shield_until_threshold";
  thresholdDamage: number;
  turns?: number;
}

export interface HealSelfStep {
  type: "heal_self";
  amountPctMaxHp: number;
}

export interface ModifyStatTempStep {
  type: "modify_stat_temp";
  stat: "attack" | "defense" | "speed";
  deltaPct: number;
  turns: number;
}

export interface RampPowerByUseCountStep {
  type: "ramp_power_by_use_count";
  gain: number;
  minMultiplier?: number;
  maxMultiplier?: number;
}

export interface ReflectPortionNextHitStep {
  type: "reflect_portion_next_hit";
  ratio: number;
  maxDamage: number;
  turns?: number;
}

export interface CleanseSelfStatusStep {
  type: "cleanse_self_status";
}

export interface RandomSpikeAttackStep {
  type: "random_spike_attack";
  minMultiplier: number;
  maxMultiplier: number;
  curve?: number;
}

export interface ApplyTypeGuardStep {
  type: "apply_type_guard";
  types: PokemonType[];
  reductionRatio: number;
  turns?: number;
}

export interface ApplyDodgeWindowStep {
  type: "apply_dodge_window";
  evadeChance: number;
  hits?: number;
  turns?: number;
}

export type BehaviorStep =
  | BaseAttackStep
  | ApplyStatusStep
  | ApplyDecayingDotStep
  | ApplyShieldUntilThresholdStep
  | HealSelfStep
  | ModifyStatTempStep
  | RampPowerByUseCountStep
  | ReflectPortionNextHitStep
  | CleanseSelfStatusStep
  | RandomSpikeAttackStep
  | ApplyTypeGuardStep
  | ApplyDodgeWindowStep;

export interface MoveBehaviorProgramV2 {
  version: "2";
  steps: BehaviorStep[];
  meta?: {
    intentLabel?: string;
  };
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
  behaviorVersion?: "v1" | "v2";
  behaviorProgram?: MoveBehaviorProgramV2 | null;
}

export interface BattlePokemonTemplate {
  id: string;
  name: string;
  types: PokemonType[];
  stats: PokemonStats;
  moves: BattleMove[];
}

export type EffectInstance =
  | {
      kind: "decaying_dot";
      id: string;
      sourceMoveId: string;
      remainingTurns: number;
      ticksElapsed: number;
      startPctMaxHp: number;
      decayPctPerTurn: number;
      minPctMaxHp: number;
    }
  | {
      kind: "shield_threshold";
      sourceMoveId: string;
      maxBlockedDamage: number;
      remainingTurns: number;
      remainingHits: number;
    }
  | {
      kind: "reflect_next_hit";
      sourceMoveId: string;
      ratio: number;
      maxDamage: number;
      remainingTurns: number;
      remainingHits: number;
    }
  | {
      kind: "temp_stat";
      sourceMoveId: string;
      stat: "attack" | "defense" | "speed";
      deltaPct: number;
      remainingTurns: number;
    }
  | {
      kind: "type_guard";
      sourceMoveId: string;
      types: PokemonType[];
      reductionRatio: number;
      remainingTurns: number;
      remainingHits: number;
    }
  | {
      kind: "dodge_window";
      sourceMoveId: string;
      evadeChance: number;
      remainingTurns: number;
      remainingHits: number;
    };

export interface BattleCombatant extends BattlePokemonTemplate {
  currentHp: number;
  status: StatusCondition | null;
  activeEffects: EffectInstance[];
  moveUsage: Record<string, number>;
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const cloneCombatant = (template: BattlePokemonTemplate): BattleCombatant => ({
  ...template,
  currentHp: template.stats.hp,
  status: null,
  activeEffects: [],
  moveUsage: {},
  moves: template.moves.map((move) => {
    const normalizedMaxPp = Math.max(1, Math.floor(move.maxPp ?? move.currentPp ?? 20));
    return {
      ...move,
      maxPp: normalizedMaxPp,
      currentPp: Math.max(0, Math.min(normalizedMaxPp, Math.floor(move.currentPp ?? normalizedMaxPp)))
    };
  })
});

const pushLog = (state: BattleState, message: string) => {
  state.log.push({ turn: state.turn, message });
};

export const calculateTypeEffectiveness = (moveType: PokemonType, defenderTypes: PokemonType[]): number =>
  defenderTypes.reduce((multiplier, defenderType) => {
    const modifier = TYPE_CHART[moveType][defenderType] ?? 1;
    return multiplier * modifier;
  }, 1);

const getEffectiveStats = (combatant: BattleCombatant): PokemonStats => {
  const activeEffects = combatant.activeEffects ?? [];
  let attackMultiplier = 1;
  let defenseMultiplier = 1;
  let speedMultiplier = 1;

  for (const effect of activeEffects) {
    if (effect.kind !== "temp_stat") {
      continue;
    }

    if (effect.stat === "attack") {
      attackMultiplier += effect.deltaPct;
    } else if (effect.stat === "defense") {
      defenseMultiplier += effect.deltaPct;
    } else {
      speedMultiplier += effect.deltaPct;
    }
  }

  return {
    hp: combatant.stats.hp,
    attack: Math.max(1, Math.floor(combatant.stats.attack * clamp(attackMultiplier, 0.5, 1.8))),
    defense: Math.max(1, Math.floor(combatant.stats.defense * clamp(defenseMultiplier, 0.5, 1.8))),
    speed: Math.max(1, Math.floor(combatant.stats.speed * clamp(speedMultiplier, 0.5, 1.8)))
  };
};

export const calculateBaseDamage = (
  attacker: BattleCombatant,
  defender: BattleCombatant,
  move: BattleMove,
  random: RandomSource = Math.random
): number => {
  const attackerStats = getEffectiveStats(attacker);
  const defenderStats = getEffectiveStats(defender);

  const stab = attacker.types.includes(move.type) ? 1.15 : 1;
  const typeEffectiveness = calculateTypeEffectiveness(move.type, defender.types);

  if (typeEffectiveness === 0) {
    return 0;
  }

  const burnPenalty = attacker.status?.kind === "burn" ? 0.8 : 1;
  const variance = 0.9 + random() * 0.1;
  const offenseRatio = attackerStats.attack / Math.max(1, defenderStats.defense);
  const scaledBase = (move.power * offenseRatio) / 3 + 2;
  const raw = scaledBase * stab;
  const damage = Math.floor(raw * typeEffectiveness * burnPenalty * variance);

  return Math.max(1, damage);
};

const findMove = (combatant: BattleCombatant, moveId: string): BattleMove =>
  combatant.moves.find((move) => move.id === moveId) ?? combatant.moves[0];

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

const getCombatants = (state: BattleState, attackerSide: BattleSide, defenderSide: BattleSide) => ({
  attacker: state[attackerSide],
  defender: state[defenderSide]
});

const applyStatusDamage = (state: BattleState, side: BattleSide) => {
  const combatant = state[side];
  if (!combatant.status || combatant.currentHp <= 0) {
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

const applyDecayingDots = (state: BattleState, side: BattleSide) => {
  const combatant = state[side];
  const kept: EffectInstance[] = [];

  for (const effect of combatant.activeEffects) {
    if (effect.kind !== "decaying_dot") {
      kept.push(effect);
      continue;
    }

    if (combatant.currentHp <= 0) {
      continue;
    }

    const pct = Math.max(effect.minPctMaxHp, effect.startPctMaxHp - effect.ticksElapsed * effect.decayPctPerTurn);
    const damage = Math.max(1, Math.floor(combatant.stats.hp * pct));
    combatant.currentHp = Math.max(0, combatant.currentHp - damage);
    pushLog(state, `${combatant.name} takes ${damage} decaying damage.`);

    const next = { ...effect, ticksElapsed: effect.ticksElapsed + 1, remainingTurns: effect.remainingTurns - 1 };
    if (next.remainingTurns > 0) {
      kept.push(next);
    }
  }

  combatant.activeEffects = kept;
};

const tickTimedEffects = (state: BattleState, side: BattleSide) => {
  const combatant = state[side];
  combatant.activeEffects = combatant.activeEffects
    .map((effect) => {
      if (
        effect.kind === "temp_stat" ||
        effect.kind === "shield_threshold" ||
        effect.kind === "reflect_next_hit" ||
        effect.kind === "type_guard" ||
        effect.kind === "dodge_window"
      ) {
        return { ...effect, remainingTurns: effect.remainingTurns - 1 };
      }
      return effect;
    })
    .filter((effect) => {
      if (effect.kind === "temp_stat") {
        return effect.remainingTurns > 0;
      }
      if (
        effect.kind === "shield_threshold" ||
        effect.kind === "reflect_next_hit" ||
        effect.kind === "type_guard" ||
        effect.kind === "dodge_window"
      ) {
        return effect.remainingTurns > 0 && effect.remainingHits > 0;
      }
      return true;
    });
};

const consumeSingleHitEffect = (
  effects: EffectInstance[],
  kind: "shield_threshold" | "reflect_next_hit" | "dodge_window"
): { updated: EffectInstance[]; current?: EffectInstance } => {
  const index = effects.findIndex((effect) => effect.kind === kind);
  if (index < 0) {
    return { updated: effects };
  }

  const current = effects[index];
  const next = [...effects];
  if (current.kind === kind) {
    const remainingHits = current.remainingHits - 1;
    if (remainingHits <= 0) {
      next.splice(index, 1);
    } else {
      next[index] = { ...current, remainingHits } as EffectInstance;
    }
  }

  return { updated: next, current };
};

const applyIncomingDamage = (
  state: BattleState,
  attackerSide: BattleSide,
  defenderSide: BattleSide,
  moveType: PokemonType,
  rawDamage: number
): number => {
  const attacker = state[attackerSide];
  const defender = state[defenderSide];

  let finalDamage = Math.max(0, Math.floor(rawDamage));

  const typeGuardIndex = defender.activeEffects.findIndex((effect) => effect.kind === "type_guard");
  if (typeGuardIndex >= 0) {
    const effect = defender.activeEffects[typeGuardIndex];
    if (effect.kind === "type_guard" && effect.types.includes(moveType)) {
      const reduced = Math.floor(finalDamage * effect.reductionRatio);
      finalDamage = Math.max(0, finalDamage - reduced);
      pushLog(state, `${defender.name}'s type guard reduced damage by ${reduced}.`);
      const remainingHits = effect.remainingHits - 1;
      if (remainingHits <= 0) {
        defender.activeEffects.splice(typeGuardIndex, 1);
      } else {
        defender.activeEffects[typeGuardIndex] = { ...effect, remainingHits };
      }
    }
  }

  const shieldResult = consumeSingleHitEffect(defender.activeEffects, "shield_threshold");
  defender.activeEffects = shieldResult.updated;
  if (shieldResult.current?.kind === "shield_threshold") {
    const blocked = Math.min(finalDamage, shieldResult.current.maxBlockedDamage);
    finalDamage = Math.max(0, finalDamage - blocked);
    pushLog(state, `${defender.name}'s shield absorbed ${blocked} damage.`);
  }

  defender.currentHp = Math.max(0, defender.currentHp - finalDamage);

  const reflectResult = consumeSingleHitEffect(defender.activeEffects, "reflect_next_hit");
  defender.activeEffects = reflectResult.updated;
  if (reflectResult.current?.kind === "reflect_next_hit" && finalDamage > 0 && attacker.currentHp > 0) {
    const reflected = Math.min(reflectResult.current.maxDamage, Math.floor(finalDamage * reflectResult.current.ratio));
    if (reflected > 0) {
      attacker.currentHp = Math.max(0, attacker.currentHp - reflected);
      pushLog(state, `${defender.name} reflected ${reflected} damage back to ${attacker.name}.`);
    }
  }

  return finalDamage;
};

const maybeDefenderDodges = (
  state: BattleState,
  attackerSide: BattleSide,
  defenderSide: BattleSide,
  move: BattleMove,
  random: RandomSource
): boolean => {
  const attacker = state[attackerSide];
  const defender = state[defenderSide];
  const dodgeResult = consumeSingleHitEffect(defender.activeEffects, "dodge_window");
  defender.activeEffects = dodgeResult.updated;

  if (dodgeResult.current?.kind !== "dodge_window") {
    return false;
  }

  if (random() <= dodgeResult.current.evadeChance) {
    pushLog(state, `${defender.name} dodged ${attacker.name}'s ${move.name}.`);
    return true;
  }

  return false;
};

const appendOrRefreshEffect = (combatant: BattleCombatant, effect: EffectInstance) => {
  if (effect.kind === "decaying_dot") {
    const existingIndex = combatant.activeEffects.findIndex(
      (entry) => entry.kind === "decaying_dot" && entry.id === effect.id
    );
    if (existingIndex >= 0) {
      combatant.activeEffects[existingIndex] = effect;
      return;
    }
  }

  if (effect.kind === "shield_threshold") {
    const existingIndex = combatant.activeEffects.findIndex((entry) => entry.kind === "shield_threshold");
    if (existingIndex >= 0) {
      combatant.activeEffects[existingIndex] = effect;
      return;
    }
  }

  if (effect.kind === "reflect_next_hit") {
    const existingIndex = combatant.activeEffects.findIndex((entry) => entry.kind === "reflect_next_hit");
    if (existingIndex >= 0) {
      combatant.activeEffects[existingIndex] = effect;
      return;
    }
  }

  if (effect.kind === "type_guard") {
    const existingIndex = combatant.activeEffects.findIndex((entry) => entry.kind === "type_guard");
    if (existingIndex >= 0) {
      combatant.activeEffects[existingIndex] = effect;
      return;
    }
  }

  if (effect.kind === "dodge_window") {
    const existingIndex = combatant.activeEffects.findIndex((entry) => entry.kind === "dodge_window");
    if (existingIndex >= 0) {
      combatant.activeEffects[existingIndex] = effect;
      return;
    }
  }

  if (effect.kind === "temp_stat") {
    const existingIndex = combatant.activeEffects.findIndex(
      (entry) => entry.kind === "temp_stat" && entry.stat === effect.stat
    );
    if (existingIndex >= 0) {
      combatant.activeEffects[existingIndex] = effect;
      return;
    }
  }

  combatant.activeEffects.push(effect);
};

interface EvaluationBudget {
  maxNodes: number;
  nodes: number;
}

interface ExpressionContext {
  self: BattleCombatant;
  target: BattleCombatant;
  moveUseCount: number;
  turn: number;
}

const readBehaviorVariable = (name: BehaviorVariableName, context: ExpressionContext): number => {
  switch (name) {
    case "self.attack":
      return getEffectiveStats(context.self).attack;
    case "self.defense":
      return getEffectiveStats(context.self).defense;
    case "self.speed":
      return getEffectiveStats(context.self).speed;
    case "self.hpPct":
      return context.self.currentHp / Math.max(1, context.self.stats.hp);
    case "target.attack":
      return getEffectiveStats(context.target).attack;
    case "target.defense":
      return getEffectiveStats(context.target).defense;
    case "target.speed":
      return getEffectiveStats(context.target).speed;
    case "target.hpPct":
      return context.target.currentHp / Math.max(1, context.target.stats.hp);
    case "move.useCount":
      return context.moveUseCount;
    case "turn":
      return context.turn;
    default:
      return 0;
  }
};

const evaluateExpression = (expression: BehaviorExpression, context: ExpressionContext, budget: EvaluationBudget): number => {
  budget.nodes += 1;
  if (budget.nodes > budget.maxNodes) {
    throw new Error("FORMULA_COMPLEXITY_EXCEEDED");
  }

  if (expression.kind === "const") {
    return expression.value;
  }

  if (expression.kind === "var") {
    return readBehaviorVariable(expression.name, context);
  }

  const evaluatedArgs = expression.args.map((arg) => evaluateExpression(arg, context, budget));

  switch (expression.op) {
    case "add":
      return evaluatedArgs.reduce((sum, value) => sum + value, 0);
    case "sub":
      return evaluatedArgs.length >= 2 ? evaluatedArgs[0] - evaluatedArgs[1] : evaluatedArgs[0] ?? 0;
    case "mul":
      return evaluatedArgs.reduce((product, value) => product * value, 1);
    case "div":
      return evaluatedArgs.length >= 2 ? evaluatedArgs[0] / Math.max(1e-6, evaluatedArgs[1]) : evaluatedArgs[0] ?? 0;
    case "min":
      return Math.min(...evaluatedArgs);
    case "max":
      return Math.max(...evaluatedArgs);
    case "clamp": {
      const value = evaluatedArgs[0] ?? 0;
      const min = evaluatedArgs[1] ?? 0;
      const max = evaluatedArgs[2] ?? min;
      return clamp(value, min, max);
    }
    case "pow": {
      const base = evaluatedArgs[0] ?? 0;
      const exponent = clamp(evaluatedArgs[1] ?? 1, -2, 2);
      return Math.pow(base, exponent);
    }
    default:
      return 0;
  }
};

const resolveBehaviorNumeric = (
  value: BehaviorNumeric | undefined,
  context: ExpressionContext,
  fallback: number,
  min: number,
  max: number
): number => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "number") {
    return clamp(value, min, max);
  }

  const raw = evaluateExpression(value, context, { maxNodes: 24, nodes: 0 });
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return clamp(raw, min, max);
};

const applyBaseAttack = (
  state: BattleState,
  attackerSide: BattleSide,
  defenderSide: BattleSide,
  move: BattleMove,
  random: RandomSource,
  powerMultiplier: number
) => {
  const { attacker, defender } = getCombatants(state, attackerSide, defenderSide);

  const poweredMove: BattleMove = {
    ...move,
    power: Math.max(1, Math.floor(move.power * clamp(powerMultiplier, 0.5, 2.5)))
  };

  const rawDamage = calculateBaseDamage(attacker, defender, poweredMove, random);
  const damage = applyIncomingDamage(state, attackerSide, defenderSide, poweredMove.type, rawDamage);

  const typeEffectiveness = calculateTypeEffectiveness(poweredMove.type, defender.types);
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

  if (
    move.inflictStatus &&
    !defender.status &&
    defender.currentHp > 0 &&
    random() <= move.inflictStatus.chance
  ) {
    defender.status = {
      kind: move.inflictStatus.kind,
      remainingTurns: move.inflictStatus.turns
    };
    pushLog(state, `${defender.name} is now ${move.inflictStatus.kind}.`);
  }
};

const executeBehaviorProgram = (
  state: BattleState,
  attackerSide: BattleSide,
  defenderSide: BattleSide,
  move: BattleMove,
  random: RandomSource
) => {
  const { attacker, defender } = getCombatants(state, attackerSide, defenderSide);
  const moveUseCount = attacker.moveUsage[move.id] ?? 1;

  const context: ExpressionContext = {
    self: attacker,
    target: defender,
    moveUseCount,
    turn: state.turn
  };

  const steps = move.behaviorProgram?.steps ?? [];
  const boundedSteps = steps.slice(0, 6);

  for (const step of boundedSteps) {
    if (maybeDeclareWinner(state)) {
      return;
    }

    switch (step.type) {
      case "base_attack": {
        const multiplier = resolveBehaviorNumeric(step.powerMultiplier, context, 1, 0.5, 2);
        applyBaseAttack(state, attackerSide, defenderSide, move, random, multiplier);
        break;
      }
      case "ramp_power_by_use_count": {
        const minMultiplier = clamp(step.minMultiplier ?? 1, 0.5, 2);
        const maxMultiplier = clamp(step.maxMultiplier ?? 1.9, minMultiplier, 2.3);
        const gain = clamp(step.gain, 0, 0.15);
        const multiplier = clamp(1 + moveUseCount * gain, minMultiplier, maxMultiplier);
        applyBaseAttack(state, attackerSide, defenderSide, move, random, multiplier);
        break;
      }
      case "random_spike_attack": {
        const minMultiplier = clamp(step.minMultiplier, 0.5, 1.8);
        const maxMultiplier = clamp(step.maxMultiplier, minMultiplier, 2.5);
        const curve = clamp(step.curve ?? 1.5, 0.5, 3);
        const roll = Math.pow(clamp(random(), 0, 1), curve);
        const multiplier = minMultiplier + (maxMultiplier - minMultiplier) * roll;
        applyBaseAttack(state, attackerSide, defenderSide, move, random, multiplier);
        break;
      }
      case "apply_status": {
        const targetSide = step.target === "self" ? attackerSide : defenderSide;
        const target = state[targetSide];
        if (!target.status && target.currentHp > 0 && random() <= clamp(step.chance, 0.05, 1)) {
          target.status = {
            kind: step.status,
            remainingTurns: Math.floor(clamp(step.turns, 1, 4))
          };
          pushLog(state, `${target.name} is now ${step.status}.`);
        }
        break;
      }
      case "apply_decaying_dot": {
        const targetSide = step.target === "self" ? attackerSide : defenderSide;
        const target = state[targetSide];
        if (target.currentHp <= 0 || random() > clamp(step.chance, 0.05, 1)) {
          break;
        }
        appendOrRefreshEffect(target, {
          kind: "decaying_dot",
          id: `${move.id}::${step.id}`,
          sourceMoveId: move.id,
          remainingTurns: Math.floor(clamp(step.turns, 2, 5)),
          ticksElapsed: 0,
          startPctMaxHp: clamp(step.startPctMaxHp, 0.03, 0.14),
          decayPctPerTurn: clamp(step.decayPctPerTurn, 0.01, 0.05),
          minPctMaxHp: clamp(step.minPctMaxHp, 0.01, 0.04)
        });
        pushLog(state, `${target.name} is afflicted by lingering damage.`);
        break;
      }
      case "apply_shield_until_threshold": {
        appendOrRefreshEffect(attacker, {
          kind: "shield_threshold",
          sourceMoveId: move.id,
          maxBlockedDamage: Math.floor(clamp(step.thresholdDamage, 1, 120)),
          remainingTurns: Math.floor(clamp(step.turns ?? 2, 1, 3)),
          remainingHits: 1
        });
        pushLog(state, `${attacker.name} raised a shield.`);
        break;
      }
      case "heal_self": {
        const heal = Math.max(1, Math.floor(attacker.stats.hp * clamp(step.amountPctMaxHp, 0.03, 0.2)));
        const before = attacker.currentHp;
        attacker.currentHp = Math.min(attacker.stats.hp, attacker.currentHp + heal);
        const actual = attacker.currentHp - before;
        if (actual > 0) {
          pushLog(state, `${attacker.name} healed ${actual} HP.`);
        }
        break;
      }
      case "modify_stat_temp": {
        appendOrRefreshEffect(attacker, {
          kind: "temp_stat",
          sourceMoveId: move.id,
          stat: step.stat,
          deltaPct: clamp(step.deltaPct, -0.25, 0.25),
          remainingTurns: Math.floor(clamp(step.turns, 1, 3))
        });
        pushLog(state, `${attacker.name}'s ${step.stat} shifted.`);
        break;
      }
      case "reflect_portion_next_hit": {
        appendOrRefreshEffect(attacker, {
          kind: "reflect_next_hit",
          sourceMoveId: move.id,
          ratio: clamp(step.ratio, 0.05, 0.8),
          maxDamage: Math.floor(clamp(step.maxDamage, 1, 80)),
          remainingTurns: Math.floor(clamp(step.turns ?? 2, 1, 3)),
          remainingHits: 1
        });
        pushLog(state, `${attacker.name} prepared a reflective barrier.`);
        break;
      }
      case "apply_type_guard": {
        appendOrRefreshEffect(attacker, {
          kind: "type_guard",
          sourceMoveId: move.id,
          types: step.types.slice(0, 2),
          reductionRatio: clamp(step.reductionRatio, 0.1, 0.85),
          remainingTurns: Math.floor(clamp(step.turns ?? 2, 1, 3)),
          remainingHits: 1
        });
        pushLog(state, `${attacker.name} set up a type guard.`);
        break;
      }
      case "apply_dodge_window": {
        appendOrRefreshEffect(attacker, {
          kind: "dodge_window",
          sourceMoveId: move.id,
          evadeChance: clamp(step.evadeChance, 0.05, 0.55),
          remainingTurns: Math.floor(clamp(step.turns ?? 2, 1, 3)),
          remainingHits: Math.floor(clamp(step.hits ?? 1, 1, 2))
        });
        pushLog(state, `${attacker.name} became evasive.`);
        break;
      }
      case "cleanse_self_status": {
        if (attacker.status) {
          attacker.status = null;
          pushLog(state, `${attacker.name} cleansed its status.`);
        }
        break;
      }
      default:
        break;
    }
  }
};

const applyMove = (
  state: BattleState,
  attackerSide: BattleSide,
  defenderSide: BattleSide,
  move: BattleMove,
  random: RandomSource
) => {
  const attacker = state[attackerSide];

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

  attacker.moveUsage[move.id] = (attacker.moveUsage[move.id] ?? 0) + 1;

  if (maybeDefenderDodges(state, attackerSide, defenderSide, move, random)) {
    return;
  }

  if (move.behaviorVersion === "v2" && move.behaviorProgram?.version === "2") {
    try {
      executeBehaviorProgram(state, attackerSide, defenderSide, move, random);
      return;
    } catch {
      pushLog(state, `${move.name} behavior failed. Falling back to base attack.`);
      applyBaseAttack(state, attackerSide, defenderSide, move, random, 1);
      return;
    }
  }

  applyBaseAttack(state, attackerSide, defenderSide, move, random, 1);
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

  const firstSpeed = getEffectiveStats(state[first.side]).speed;
  const secondSpeed = getEffectiveStats(state[second.side]).speed;

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

  let behaviorBonus = 0;
  if (move.behaviorVersion === "v2" && move.behaviorProgram?.version === "2") {
    behaviorBonus += move.behaviorProgram.steps.some((step) => step.type === "apply_shield_until_threshold") ? 6 : 0;
    behaviorBonus += move.behaviorProgram.steps.some((step) => step.type === "heal_self") ? 5 : 0;
    behaviorBonus += move.behaviorProgram.steps.some((step) => step.type === "apply_decaying_dot") ? 8 : 0;
    behaviorBonus += move.behaviorProgram.steps.some((step) => step.type === "ramp_power_by_use_count") ? 7 : 0;
    behaviorBonus += move.behaviorProgram.steps.some((step) => step.type === "random_spike_attack") ? 7 : 0;
    behaviorBonus += move.behaviorProgram.steps.some((step) => step.type === "apply_type_guard") ? 6 : 0;
    behaviorBonus += move.behaviorProgram.steps.some((step) => step.type === "apply_dodge_window") ? 6 : 0;
  }

  return expectedDamage + finishingBonus + statusBonus + priorityBonus + behaviorBonus - accuracyPenalty;
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
    player: {
      ...previousState.player,
      activeEffects: previousState.player.activeEffects.map((effect) => ({ ...effect })),
      moveUsage: { ...previousState.player.moveUsage },
      moves: previousState.player.moves.map((move) => ({ ...move }))
    },
    opponent: {
      ...previousState.opponent,
      activeEffects: previousState.opponent.activeEffects.map((effect) => ({ ...effect })),
      moveUsage: { ...previousState.opponent.moveUsage },
      moves: previousState.opponent.moves.map((move) => ({ ...move }))
    },
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
  applyDecayingDots(state, "player");
  applyDecayingDots(state, "opponent");
  tickTimedEffects(state, "player");
  tickTimedEffects(state, "opponent");

  maybeDeclareWinner(state);

  state.turn += 1;
  return state;
};
