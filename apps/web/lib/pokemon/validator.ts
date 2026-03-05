import { z } from "zod";
import { type BattleMove, type MoveBehaviorProgramV2, type PokemonType } from "@pokeforge/battle-engine";
import { moveBehaviorProgramV2Schema } from "@/lib/pokemon/move-behavior";

const statSchema = z.object({
  hp: z.number().int().min(35).max(140),
  attack: z.number().int().min(30).max(140),
  defense: z.number().int().min(30).max(140),
  speed: z.number().int().min(20).max(140)
});

const moveSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(24),
    type: z.enum([
      "normal",
      "fire",
      "water",
      "grass",
      "electric",
      "rock",
      "ground",
      "ice",
      "fighting",
      "psychic"
    ]),
    power: z.number().int().min(20).max(120),
    accuracy: z.number().min(0.6).max(1),
    maxPp: z.number().int().min(5).max(40),
    currentPp: z.number().int().min(0).max(40).optional(),
    priority: z.number().int().min(-2).max(2).optional(),
    behaviorVersion: z.enum(["v1", "v2"]).default("v1"),
    behaviorProgram: moveBehaviorProgramV2Schema.nullish()
  })
  .strict();

export interface PokemonDraft {
  name: string;
  primaryType: PokemonType;
  secondaryType?: PokemonType;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  moves: BattleMove[];
  balanceReport?: Record<string, unknown>;
}

export interface ValidationResult {
  passed: boolean;
  reasons: string[];
  code?: string;
}

export const validatePokemonDraft = (draft: PokemonDraft): ValidationResult => {
  const reasons: string[] = [];

  const parsedStats = statSchema.safeParse(draft.stats);
  if (!parsedStats.success) {
    reasons.push("Stats are out of v1 bounds.");
  }

  const totalStats = draft.stats.hp + draft.stats.attack + draft.stats.defense + draft.stats.speed;
  if (totalStats > 430) {
    reasons.push("Base stat total exceeds v1 cap (430).");
  }

  if (!Array.isArray(draft.moves) || draft.moves.length !== 4) {
    reasons.push("Generated pokemon must define exactly 4 moves.");
  }

  for (const [index, move] of draft.moves.entries()) {
    const parsedMove = moveSchema.safeParse(move);
    if (!parsedMove.success) {
      reasons.push(`Move #${index + 1} has invalid fields or out-of-bounds values.`);
      continue;
    }

    const normalizedPp = parsedMove.data.currentPp ?? parsedMove.data.maxPp;
    if (normalizedPp > parsedMove.data.maxPp) {
      reasons.push(`Move #${index + 1} has current PP above max PP.`);
    }

    if (parsedMove.data.behaviorVersion === "v2") {
      if (!parsedMove.data.behaviorProgram) {
        reasons.push(`Move #${index + 1} is v2 but missing behavior program.`);
      }
    } else if (parsedMove.data.behaviorProgram) {
      reasons.push(`Move #${index + 1} is v1 but includes a behavior program.`);
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
    code: reasons.length === 0 ? undefined : "INVALID_BEHAVIOR_SCHEMA"
  };
};
