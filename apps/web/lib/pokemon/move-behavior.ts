import { z } from "zod";

const behaviorVariableSchema = z.enum([
  "self.attack",
  "self.defense",
  "self.speed",
  "self.hpPct",
  "target.attack",
  "target.defense",
  "target.speed",
  "target.hpPct",
  "move.useCount",
  "turn"
]);

export const behaviorExpressionSchema: z.ZodType<
  | { kind: "const"; value: number }
  | { kind: "var"; name: z.infer<typeof behaviorVariableSchema> }
  | {
      kind: "op";
      op: "add" | "sub" | "mul" | "div" | "min" | "max" | "clamp" | "pow";
      args: any[];
    }
> = z.lazy(() =>
  z.union([
    z
      .object({
        kind: z.literal("const"),
        value: z.number()
      })
      .strict(),
    z
      .object({
        kind: z.literal("var"),
        name: behaviorVariableSchema
      })
      .strict(),
    z
      .object({
        kind: z.literal("op"),
        op: z.enum(["add", "sub", "mul", "div", "min", "max", "clamp", "pow"]),
        args: z.array(behaviorExpressionSchema).min(1).max(4)
      })
      .strict()
  ])
);

const behaviorNumericSchema = z.union([z.number(), behaviorExpressionSchema]);

const baseAttackStepSchema = z
  .object({
    type: z.literal("base_attack"),
    powerMultiplier: behaviorNumericSchema.optional()
  })
  .strict();

const applyStatusStepSchema = z
  .object({
    type: z.literal("apply_status"),
    target: z.enum(["opponent", "self"]),
    status: z.enum(["burn", "poison"]),
    chance: z.number().min(0.05).max(1),
    turns: z.number().int().min(1).max(4)
  })
  .strict();

const applyDecayingDotStepSchema = z
  .object({
    type: z.literal("apply_decaying_dot"),
    id: z.string().min(1).max(40),
    target: z.enum(["opponent", "self"]),
    chance: z.number().min(0.05).max(1),
    turns: z.number().int().min(2).max(5),
    startPctMaxHp: z.number().min(0.03).max(0.14),
    decayPctPerTurn: z.number().min(0.01).max(0.05),
    minPctMaxHp: z.number().min(0.01).max(0.04)
  })
  .strict();

const applyShieldStepSchema = z
  .object({
    type: z.literal("apply_shield_until_threshold"),
    thresholdDamage: z.number().int().min(1).max(120),
    turns: z.number().int().min(1).max(3).optional()
  })
  .strict();

const healSelfStepSchema = z
  .object({
    type: z.literal("heal_self"),
    amountPctMaxHp: z.number().min(0.03).max(0.2)
  })
  .strict();

const modifyStatTempStepSchema = z
  .object({
    type: z.literal("modify_stat_temp"),
    stat: z.enum(["attack", "defense", "speed"]),
    deltaPct: z.number().min(-0.25).max(0.25),
    turns: z.number().int().min(1).max(3)
  })
  .strict();

const rampPowerStepSchema = z
  .object({
    type: z.literal("ramp_power_by_use_count"),
    gain: z.number().min(0).max(0.15),
    minMultiplier: z.number().min(0.5).max(2).optional(),
    maxMultiplier: z.number().min(0.5).max(2.3).optional()
  })
  .strict();

const reflectStepSchema = z
  .object({
    type: z.literal("reflect_portion_next_hit"),
    ratio: z.number().min(0.05).max(0.8),
    maxDamage: z.number().int().min(1).max(80),
    turns: z.number().int().min(1).max(3).optional()
  })
  .strict();

const cleanseSelfStatusStepSchema = z
  .object({
    type: z.literal("cleanse_self_status")
  })
  .strict();

export const behaviorStepSchema = z.union([
  baseAttackStepSchema,
  applyStatusStepSchema,
  applyDecayingDotStepSchema,
  applyShieldStepSchema,
  healSelfStepSchema,
  modifyStatTempStepSchema,
  rampPowerStepSchema,
  reflectStepSchema,
  cleanseSelfStatusStepSchema
]);

export const moveBehaviorProgramV2Schema = z
  .object({
    version: z.literal("2"),
    steps: z.array(behaviorStepSchema).min(1).max(6),
    meta: z
      .object({
        intentLabel: z.string().max(80).optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const fallbackBehaviorProgramV2 = {
  version: "2" as const,
  steps: [
    {
      type: "base_attack" as const
    }
  ]
};
