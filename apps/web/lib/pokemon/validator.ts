import { z } from "zod";
import { type BehaviorScript } from "@/lib/pokemon/behavior-script";

const statSchema = z.object({
  hp: z.number().int().min(35).max(140),
  attack: z.number().int().min(30).max(140),
  defense: z.number().int().min(30).max(140),
  speed: z.number().int().min(20).max(140)
});

export interface PokemonDraft {
  name: string;
  primaryType: string;
  secondaryType?: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  behaviorScript: BehaviorScript;
}

export interface ValidationResult {
  passed: boolean;
  reasons: string[];
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

  const tooManyEffects = draft.behaviorScript.hooks.some((hook) => hook.effects.length > 4);
  if (tooManyEffects) {
    reasons.push("At least one hook contains too many effects (max 4).");
  }

  return {
    passed: reasons.length === 0,
    reasons
  };
};
