import { getEnv } from "@/lib/config/env";

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

const categoryLabels: Record<string, string> = {
  "hate": "hate",
  "hate/threatening": "hate-threatening",
  "self-harm": "self-harm",
  "self-harm/instructions": "self-harm-instructions",
  "self-harm/intent": "self-harm-intent",
  "sexual/minors": "sexual-minors",
  "violence/graphic": "graphic-violence"
};

export const moderateGenerationPrompt = async (prompt: string): Promise<ModerationResult> => {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    return { allowed: true };
  }

  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: prompt
    })
  });

  if (!response.ok) {
    // Fail-open for moderation service errors; local policy checks still run.
    return { allowed: true };
  }

  const json = await response.json();
  const result = json.results?.[0];
  if (!result?.flagged) {
    return { allowed: true };
  }

  const categories = result.categories ?? {};
  const triggered = Object.entries(categoryLabels)
    .filter(([key]) => Boolean(categories[key]))
    .map(([, label]) => label);

  return {
    allowed: false,
    reason:
      triggered.length > 0
        ? `Prompt blocked by moderation policy (${triggered.join(", ")}).`
        : "Prompt blocked by moderation policy."
  };
};
