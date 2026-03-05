import { getEnv } from "@/lib/config/env";
import { type BehaviorScript } from "@/lib/pokemon/behavior-script";
import { type PokemonDraft } from "@/lib/pokemon/validator";

export interface PokemonGenerationInput {
  prompt: string;
}

const defaultBehavior: BehaviorScript = {
  version: "1",
  hooks: [
    {
      hook: "onAttack",
      effects: [{ type: "applyStatus", status: "burn", turns: 2, chance: 0.2 }]
    }
  ]
};

// Placeholder implementation until Codex SDK wiring is added in Milestone 4.
export const generatePokemonDraftWithCodex = async (
  input: PokemonGenerationInput
): Promise<PokemonDraft> => {
  const env = getEnv();
  if (!env.CODEX_API_KEY) {
    throw new Error("CODEX_API_KEY is required for generation.");
  }

  return {
    name: input.prompt.slice(0, 24) || "ForgeMon",
    primaryType: "fire",
    stats: {
      hp: 85,
      attack: 90,
      defense: 75,
      speed: 80
    },
    behaviorScript: defaultBehavior
  };
};
