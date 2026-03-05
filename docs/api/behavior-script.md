# Behavior Script Contract (v1)

Goal: enable novel Pokemon behavior without executing arbitrary source code.

## Model
`behavior_script` is persisted as JSON and interpreted by the battle engine.

Top-level shape:

```ts
interface BehaviorScript {
  version: "1";
  hooks: HookDefinition[];
}

type HookName = "onTurnStart" | "onAttack" | "onDamageTaken" | "onTurnEnd";

interface HookDefinition {
  hook: HookName;
  effects: Effect[];
}

type Effect =
  | { type: "dealDamage"; amount: number; target: "opponent" | "self" }
  | { type: "applyStatus"; status: "burn" | "poison"; turns: number; chance: number }
  | { type: "heal"; amount: number }
  | { type: "modifyStat"; stat: "attack" | "defense" | "speed"; delta: number; turns: number };
```

## Hard Constraints
- Allowed hooks are fixed.
- Allowed effect types are fixed.
- No loops, recursion, dynamic imports, or external calls.
- Max effects per hook: 4.
- Max status duration: 4 turns.
- Total expected damage budget per 3 turns must remain within validator bounds.

## Why this over `eval`
- Preserves flexibility for novel mechanics (e.g., damage-over-time, buffs, trigger effects).
- Eliminates arbitrary code execution risks.
- Keeps combat deterministic and straightforward to test.
