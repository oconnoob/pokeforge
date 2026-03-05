import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { type BehaviorScript } from "@/lib/pokemon/behavior-script";
import { type PokemonDraft } from "@/lib/pokemon/validator";

export interface PokemonGenerationInput {
  prompt: string;
}

const allowedTypes = [
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
] as const;

const behaviorEffectSchema = z.union([
  z.object({ type: z.literal("dealDamage"), amount: z.number().int().min(1).max(60), target: z.enum(["opponent", "self"]) }),
  z.object({
    type: z.literal("applyStatus"),
    status: z.enum(["burn", "poison"]),
    turns: z.number().int().min(1).max(4),
    chance: z.number().min(0.05).max(1)
  }),
  z.object({ type: z.literal("heal"), amount: z.number().int().min(1).max(40) }),
  z.object({
    type: z.literal("modifyStat"),
    stat: z.enum(["attack", "defense", "speed"]),
    delta: z.number().int().min(-20).max(20),
    turns: z.number().int().min(1).max(4)
  })
]);

const behaviorScriptSchema = z.object({
  version: z.union([z.literal("1"), z.literal(1)]).transform(() => "1" as const),
  hooks: z.array(
    z.object({
      hook: z.enum(["onTurnStart", "onAttack", "onDamageTaken", "onTurnEnd"]),
      effects: z.array(behaviorEffectSchema).max(4)
    })
  )
});

const generatedSchema = z.object({
  name: z.string().min(3).max(24),
  primaryType: z.enum(allowedTypes),
  secondaryType: z.enum(allowedTypes).optional(),
  stats: z.object({
    hp: z.number().int().min(35).max(140),
    attack: z.number().int().min(30).max(140),
    defense: z.number().int().min(30).max(140),
    speed: z.number().int().min(20).max(140)
  })
});

const fallbackBehaviorScript: BehaviorScript = {
  version: "1",
  hooks: [
    {
      hook: "onAttack",
      effects: [{ type: "applyStatus", status: "burn", turns: 2, chance: 0.2 }]
    }
  ]
};

const resolveBehaviorScript = (raw: unknown): BehaviorScript => {
  const candidate =
    raw && typeof raw === "object"
      ? (raw as { behaviorScript?: unknown; behavior_script?: unknown; behavior?: unknown; script?: unknown })
          .behaviorScript ??
        (raw as { behavior_script?: unknown }).behavior_script ??
        (raw as { behavior?: unknown }).behavior ??
        (raw as { script?: unknown }).script
      : undefined;

  const parsed = behaviorScriptSchema.safeParse(candidate);
  if (parsed.success) {
    return parsed.data as BehaviorScript;
  }

  return fallbackBehaviorScript;
};

const normalizeName = (name: string): string => {
  const sanitized = name.replace(/[^a-zA-Z0-9\-\s]/g, "").trim();
  return sanitized.length > 0 ? sanitized.slice(0, 24) : "ForgeMon";
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeDraft = (draft: z.infer<typeof generatedSchema>, behaviorScript: BehaviorScript): PokemonDraft => {
  const normalized: PokemonDraft = {
    name: normalizeName(draft.name),
    primaryType: draft.primaryType,
    secondaryType: draft.secondaryType,
    stats: {
      hp: clamp(draft.stats.hp, 35, 140),
      attack: clamp(draft.stats.attack, 30, 140),
      defense: clamp(draft.stats.defense, 30, 140),
      speed: clamp(draft.stats.speed, 20, 140)
    },
    behaviorScript
  };

  const total = normalized.stats.hp + normalized.stats.attack + normalized.stats.defense + normalized.stats.speed;
  if (total > 430) {
    const scale = 430 / total;
    normalized.stats.hp = clamp(Math.floor(normalized.stats.hp * scale), 35, 140);
    normalized.stats.attack = clamp(Math.floor(normalized.stats.attack * scale), 30, 140);
    normalized.stats.defense = clamp(Math.floor(normalized.stats.defense * scale), 30, 140);
    normalized.stats.speed = clamp(Math.floor(normalized.stats.speed * scale), 20, 140);
  }

  return normalized;
};

const promptTemplate = (prompt: string) => `
You are designing a balanced custom Pokemon for a FireRed-inspired 1v1 battle game.
Create one Pokemon from this user description: "${prompt}".

Rules:
- Use one primaryType from: ${allowedTypes.join(", ")}.
- secondaryType optional and must also be from that list.
- Keep total stats (hp+attack+defense+speed) near <= 430.
- Provide behaviorScript using the exact DSL shape.
- effects max 4 per hook.
- No invented fields.

Return JSON only.
`;

export const generatePokemonDraftWithCodex = async (input: PokemonGenerationInput): Promise<PokemonDraft> => {
  const env = getEnv();
  const apiKey = env.CODEX_API_KEY || env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("CODEX_API_KEY or OPENAI_API_KEY is required for generation.");
  }

  const model = env.CODEX_MODEL ?? "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return only valid JSON matching the requested schema."
        },
        {
          role: "user",
          content: promptTemplate(input.prompt)
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Codex API request failed: ${text}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content as string | undefined;

  if (!content) {
    throw new Error("Codex generation returned empty content.");
  }

  const parsedRaw = JSON.parse(content);
  const parsed = generatedSchema.parse(parsedRaw);
  const behaviorScript = resolveBehaviorScript(parsedRaw);
  return normalizeDraft(parsed, behaviorScript);
};
