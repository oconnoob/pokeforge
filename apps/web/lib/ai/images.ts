import { getEnv } from "@/lib/config/env";

export interface GeneratedImagePair {
  frontImageUrl: string;
  backImageUrl: string;
}

// Placeholder implementation until OpenAI image generation integration is added in Milestone 4.
export const generatePokemonImagePair = async (name: string, description: string): Promise<GeneratedImagePair> => {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for image generation.");
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  void description;

  return {
    frontImageUrl: `https://example.com/${slug}-front.png`,
    backImageUrl: `https://example.com/${slug}-back.png`
  };
};
