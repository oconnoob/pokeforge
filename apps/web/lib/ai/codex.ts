import { z } from "zod";
import { reviewBehaviorFunctionSource, type BattleMove, type PokemonType } from "@pokeforge/battle-engine";
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
    public readonly code: "INVALID_BEHAVIOR_SCHEMA" | "GENERATION_FAILED" | "FUNCTION_SECURITY_REVIEW_FAILED",
    public readonly reasons: string[] = []
  ) {
    super(message);
    this.name = "CodexGenerationError";
  }
}

export interface MoveFunctionSecurityReview {
  approved: boolean;
  reasons: string[];
  reviewer: "codex";
  model: string;
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
    behaviorProgram: z.unknown().nullish(),
    behaviorFunction: z.string().max(1800).nullish()
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

const fallbackFunctionByType = (type: PokemonType): string => {
  switch (type) {
    case "fire":
      return `
const roll = typeof ctx.roll === "number" ? ctx.roll : 0;
return {
  powerMultiplier: 1.08,
  applyStatus: roll < 0.26 ? { target: "opponent", kind: "burn", chance: 1, turns: 2 } : undefined
};
`;
    case "water":
      return `
const hpPct = ctx.attacker.maxHp > 0 ? ctx.attacker.hp / ctx.attacker.maxHp : 1;
return {
  powerMultiplier: hpPct < 0.45 ? 1.18 : 1
};
`;
    case "psychic":
      return `
const hpPct = ctx.attacker.maxHp > 0 ? ctx.attacker.hp / ctx.attacker.maxHp : 1;
if (hpPct < 0.6) {
  return { skipAttack: true, shieldThreshold: 26, logMessage: "Psychic guard forms." };
}
return { powerMultiplier: 1.04 };
`;
    default:
      return `
return { powerMultiplier: 1.05 };
`;
  }
};

const normalizeBehaviorFunction = (raw: unknown): string | null => {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1800) : null;
};

const normalizeMoves = (
  name: string,
  primaryType: PokemonType,
  rawMoves: z.infer<typeof generatedMoveSchema>[],
  options: { enableFunctionBlobs: boolean }
): BattleMove[] => {
  const fallbackMoves = createDefaultMovesForType(name, primaryType);

  if (rawMoves.length !== 4) {
    return fallbackMoves;
  }

  const baseSlug = slugify(name) || "forgemon";
  const normalizedMoves = rawMoves.slice(0, 4).map((move, index) => {
    const fallback = fallbackMoves[index] ?? fallbackMoves[0];
    const behaviorVersion = move.behaviorVersion;
    const parsedProgram = moveBehaviorProgramV2Schema.safeParse(move.behaviorProgram);
    const behaviorFunction = normalizeBehaviorFunction(move.behaviorFunction);

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
      behaviorFunction: options.enableFunctionBlobs ? behaviorFunction : null,
      behaviorFunctionReview: null,
      inflictStatus: fallback?.inflictStatus
    } satisfies BattleMove;
  });

  if (!options.enableFunctionBlobs) {
    return normalizedMoves;
  }

  const hasAtLeastOneFunction = normalizedMoves.some(
    (move) => typeof move.behaviorFunction === "string" && move.behaviorFunction.trim().length > 0
  );
  if (hasAtLeastOneFunction) {
    return normalizedMoves;
  }

  return normalizedMoves.map((move, index) =>
    index === 0
      ? {
          ...move,
          behaviorVersion: "v2",
          behaviorProgram: move.behaviorProgram ?? fallbackBehaviorProgramV2,
          behaviorFunction: fallbackFunctionByType(move.type)
        }
      : move
  );
};

const normalizeDraft = (draft: z.infer<typeof generatedSchema>, options: { enableFunctionBlobs: boolean }): PokemonDraft => {
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
    moves: normalizeMoves(draft.name, draft.primaryType, draft.moves, options)
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
- Each move must define: name, type, power, accuracy, maxPp, optional currentPp, optional priority, behaviorVersion, behaviorProgram, optional behaviorFunction.
- behaviorVersion v1 => behaviorProgram must be null.
- behaviorVersion v2 => behaviorProgram must use version "2" and 1-6 valid steps.
- At least one move should include a non-null behaviorFunction.
- behaviorFunction must be ONLY a JS function body that returns an object.
- Do not include imports, eval, Function constructor, process/globalThis/window/document, or loops.
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

const callCodexJson = async ({
  model,
  apiKey,
  system,
  user,
  temperature
}: {
  model: string;
  apiKey: string;
  system: string;
  user: string;
  temperature: number;
}) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: system
        },
        {
          role: "user",
          content: user
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new CodexGenerationError(`Codex API request failed: ${text}`, "GENERATION_FAILED");
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new CodexGenerationError("Codex generation returned empty content.", "GENERATION_FAILED");
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new CodexGenerationError("Generated output was not valid JSON.", "INVALID_BEHAVIOR_SCHEMA", [
      "root: model returned invalid JSON"
    ]);
  }
};

const functionReviewSchema = z
  .object({
    approved: z.boolean(),
    reasons: z.array(z.string()).max(12)
  })
  .strict();

export const reviewMoveFunctionsWithCodex = async (
  moves: Array<{
    id: string;
    name: string;
    behaviorFunction?: string | null;
  }>
): Promise<MoveFunctionSecurityReview> => {
  const env = getEnv();
  const apiKey = env.CODEX_API_KEY || env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("CODEX_API_KEY or OPENAI_API_KEY is required for generation.");
  }

  const model = env.CODEX_MODEL ?? "gpt-4.1-mini";
  const moveFunctions = moves
    .filter((move) => typeof move.behaviorFunction === "string" && move.behaviorFunction.trim().length > 0)
    .map((move) => ({
      id: move.id,
      name: move.name,
      source: move.behaviorFunction?.trim() ?? ""
    }));

  if (moveFunctions.length === 0) {
    return {
      approved: true,
      reasons: [],
      reviewer: "codex",
      model
    };
  }

  const localReasons = moveFunctions.flatMap((entry) =>
    reviewBehaviorFunctionSource(entry.source).map((reason) => `${entry.name}: ${reason}`)
  );
  if (localReasons.length > 0) {
    return {
      approved: false,
      reasons: localReasons.slice(0, 12),
      reviewer: "codex",
      model
    };
  }

  const reviewRaw = await callCodexJson({
    model,
    apiKey,
    temperature: 0,
    system: "You review generated JavaScript function bodies for safety. Return JSON only.",
    user: `
Review these move function bodies for safety.
Reject if any function attempts sandbox escape, dynamic code execution, external IO, global access, or unbounded loops.
Return JSON: {"approved": boolean, "reasons": string[]}

Functions:
${JSON.stringify(moveFunctions)}
`
  });
  const parsedReview = functionReviewSchema.safeParse(reviewRaw);
  if (!parsedReview.success) {
    throw new CodexGenerationError(
      "Function security review did not return expected schema.",
      "FUNCTION_SECURITY_REVIEW_FAILED",
      summarizeSchemaIssues(parsedReview.error.issues)
    );
  }

  return {
    approved: parsedReview.data.approved,
    reasons: parsedReview.data.reasons,
    reviewer: "codex",
    model
  };
};

export const generatePokemonDraftWithCodex = async (input: PokemonGenerationInput): Promise<PokemonDraft> => {
  const env = getEnv();
  const apiKey = env.CODEX_API_KEY || env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("CODEX_API_KEY or OPENAI_API_KEY is required for generation.");
  }

  const model = env.CODEX_MODEL ?? "gpt-4.1-mini";
  const enableFunctionBlobs = env.ENABLE_MOVE_FUNCTION_BLOBS === "true";

  const parsedRaw = await callCodexJson({
    model,
    apiKey,
    temperature: 0.65,
    system: "Return only valid JSON matching the requested schema. No extra keys.",
    user: promptTemplate(input.prompt, input.rejectionReasons)
  });
  const parsed = generatedSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    throw new CodexGenerationError(
      "Generated output failed schema validation.",
      "INVALID_BEHAVIOR_SCHEMA",
      summarizeSchemaIssues(parsed.error.issues)
    );
  }

  return normalizeDraft(parsed.data, { enableFunctionBlobs });
};
