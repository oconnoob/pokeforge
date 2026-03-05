export type HookName = "onTurnStart" | "onAttack" | "onDamageTaken" | "onTurnEnd";

export type Effect =
  | { type: "dealDamage"; amount: number; target: "opponent" | "self" }
  | { type: "applyStatus"; status: "burn" | "poison"; turns: number; chance: number }
  | { type: "heal"; amount: number }
  | { type: "modifyStat"; stat: "attack" | "defense" | "speed"; delta: number; turns: number };

export interface HookDefinition {
  hook: HookName;
  effects: Effect[];
}

export interface BehaviorScript {
  version: "1";
  hooks: HookDefinition[];
}
