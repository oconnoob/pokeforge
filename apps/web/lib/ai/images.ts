import { getEnv } from "@/lib/config/env";

export interface GeneratedImagePair {
  frontPng: Buffer;
  backPng: Buffer;
}

const generateRawImage = async (apiKey: string, prompt: string): Promise<Buffer> => {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image generation failed: ${text}`);
  }

  const json = await response.json();
  const base64 = json.data?.[0]?.b64_json as string | undefined;

  if (!base64) {
    throw new Error("Image generation returned no image data.");
  }

  return Buffer.from(base64, "base64");
};

export const generatePokemonImagePair = async (name: string, description: string): Promise<GeneratedImagePair> => {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for image generation.");
  }

  const [frontPng, backPng] = await Promise.all([
    generateRawImage(
      env.OPENAI_API_KEY,
      `Pokemon front sprite style, centered on transparent background. Subject: ${name}. Description: ${description}`
    ),
    generateRawImage(
      env.OPENAI_API_KEY,
      `Pokemon back sprite style, centered on transparent background. Subject: ${name}. Description: ${description}`
    )
  ]);

  return {
    frontPng,
    backPng
  };
};
