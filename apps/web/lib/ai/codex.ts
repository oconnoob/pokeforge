import { z } from "zod";
import { type BattleMove, type PokemonType } from "@pokeforge/battle-engine";
import { getEnv } from "@/lib/config/env";
import { createDefaultMovesForType } from "@/lib/pokemon/catalog";
import { fallbackBehaviorProgramV2, moveBehaviorProgramV2Schema } from "@/lib/pokemon/move-behavior";
import { type PokemonDraft } from "@/lib/pokemon/validator";

export interface PokemonGenerationInput {
  prompt: string;
  rejectionReasons?: string[];
}

export class CodexGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_BEHAVIOR_SCHEMA" | "GENERATION_FAILED",
    public readonly reasons: string[] = []
  ) {
    super(message);
    this.name = "CodexGenerationError";
  }
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

const generatedMoveSchema = z
  .object({
    name: z.string().min(1).max(24),
    type: z.enum(allowedTypes),
    power: z.coerce.number().finite(),
    accuracy: z.coerce.number().finite(),
    maxPp: z.coerce.number().int().finite(),
    currentPp: z.coerce.number().int().finite().optional(),
    priority: z.coerce.number().int().finite().optional(),
    behaviorVersion: z.enum(["v1", "v2"]).default("v1"),
    behaviorProgram: z.unknown().nullish()
  })
  .strict();

const generatedSchema = z
  .object({
    name: z.string().min(3).max(24),
    primaryType: z.enum(allowedTypes),
    secondaryType: z.enum(allowedTypes).nullish(),
    stats: z
      .object({
        hp: z.coerce.number().int().finite(),
        attack: z.coerce.number().int().finite(),
        defense: z.coerce.number().int().finite(),
        speed: z.coerce.number().int().finite()
      })
      .strict(),
    moves: z.array(generatedMoveSchema).min(4).max(4)
  })
  .strict();

const normalizeName = (name: string): string => {
  const sanitized = name.replace(/[^a-zA-Z0-9\-\s]/g, "").trim();
  return sanitized.length > 0 ? sanitized.slice(0, 24) : "ForgeMon";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeMoves = (name: string, primaryType: PokemonType, rawMoves: z.infer<typeof generatedMoveSchema>[]): BattleMove[] => {
  const fallbackMoves = createDefaultMovesForType(name, primaryType);

  if (rawMoves.length !== 4) {
    return fallbackMoves;
  }

  const baseSlug = slugify(name) || "forgemon";
  return rawMoves.slice(0, 4).map((move, index) => {
    const fallback = fallbackMoves[index] ?? fallbackMoves[0];
    const behaviorVersion = move.behaviorVersion;
    const parsedProgram = moveBehaviorProgramV2Schema.safeParse(move.behaviorProgram);

    return {
      id: `${baseSlug}-${index + 1}-${slugify(move.name) || "move"}`,
      name: normalizeName(move.name),
      type: move.type,
      power: clamp(Math.floor(move.power), 20, 120),
      accuracy: clamp(move.accuracy, 0.6, 1),
      maxPp: clamp(Math.floor(move.maxPp), 5, 40),
      currentPp: clamp(Math.floor(move.currentPp ?? move.maxPp), 0, 40),
      priority: clamp(Math.floor(move.priority ?? 0), -2, 2),
      behaviorVersion,
      behaviorProgram:
        behaviorVersion === "v2"
          ? parsedProgram.success
            ? parsedProgram.data
            : fallbackBehaviorProgramV2
          : null,
      inflictStatus: fallback?.inflictStatus
    } satisfies BattleMove;
  });
};

const normalizeDraft = (draft: z.infer<typeof generatedSchema>): PokemonDraft => {
  const normalized: PokemonDraft = {
    name: normalizeName(draft.name),
    primaryType: draft.primaryType,
    secondaryType: draft.secondaryType ?? undefined,
    stats: {
      hp: clamp(draft.stats.hp, 35, 140),
      attack: clamp(draft.stats.attack, 30, 140),
      defense: clamp(draft.stats.defense, 30, 140),
      speed: clamp(draft.stats.speed, 20, 140)
    },
    moves: normalizeMoves(draft.name, draft.primaryType, draft.moves)
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

const promptTemplate = (prompt: string, rejectionReasons?: string[]) => `
You are designing a balanced custom Pokemon for a FireRed-inspired 1v1 battle game.
Create one Pokemon from this user description: "${prompt}".

Rules:
- Use one primaryType from: ${allowedTypes.join(", ")}.
- secondaryType optional and must also be from that list.
- Keep total stats (hp+attack+defense+speed) near <= 430.
- Return exactly 4 moves.
- Each move must define: name, type, power, accuracy, maxPp, optional currentPp, optional priority, behaviorVersion, behaviorProgram.
- behaviorVersion v1 => behaviorProgram must be null.
- behaviorVersion v2 => behaviorProgram must use version "2" and 1-6 valid steps.
- v2 steps may compose these primitives only:
  - base_attack
  - random_spike_attack
  - apply_status
  - apply_decaying_dot
  - apply_shield_until_threshold
  - apply_type_guard
  - apply_dodge_window
  - heal_self
  - modify_stat_temp
  - ramp_power_by_use_count
  - reflect_portion_next_hit
  - cleanse_self_status
- Compose mechanics creatively but safely (example: base_attack + apply_decaying_dot, or apply_type_guard + apply_dodge_window).
- Keep values in strict bounds; no invented fields.
- Prefer one creative mechanic and keep others straightforward.
${rejectionReasons && rejectionReasons.length > 0 ? `- Previous attempt failed for: ${rejectionReasons.join("; ")}. Fix these exactly.` : ""}

Return JSON only.
`;

const formatIssuePath = (path: Array<string | number>) => (path.length === 0 ? "root" : path.join("."));

const summarizeSchemaIssues = (issues: z.ZodIssue[]): string[] => {
  const summarized = issues.slice(0, 8).map((issue) => {
    const issuePath = formatIssuePath(issue.path);
    if (issue.code === "invalid_union") {
      return `${issuePath}: invalid structured value`;
    }

    return `${issuePath}: ${issue.message}`;
  });

  return Array.from(new Set(summarized));
};

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
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return only valid JSON matching the requested schema. No extra keys."
        },
        {
          role: "user",
          content: promptTemplate(input.prompt, input.rejectionReasons)
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
    throw new CodexGenerationError("Codex generation returned empty content.", "GENERATION_FAILED");
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(content);
  } catch {
    throw new CodexGenerationError(
      "Generated output was not valid JSON.",
      "INVALID_BEHAVIOR_SCHEMA",
      ["root: model returned invalid JSON"]
    );
  }

  const parsed = generatedSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    throw new CodexGenerationError(
      "Generated output failed schema validation.",
      "INVALID_BEHAVIOR_SCHEMA",
      summarizeSchemaIssues(parsed.error.issues)
    );
  }

  return normalizeDraft(parsed.data);
};
