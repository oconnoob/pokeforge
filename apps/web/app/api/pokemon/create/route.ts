import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CodexGenerationError, generatePokemonDraftWithCodex } from "@/lib/ai/codex";
import { generatePokemonImagePair } from "@/lib/ai/images";
import { moderateGenerationPrompt } from "@/lib/ai/moderation";
import { getEnv } from "@/lib/config/env";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";
import { validateBalance } from "@/lib/pokemon/balance";
import { persistGeneratedPokemon } from "@/lib/pokemon/generation-repository";
import { validatePokemonDraft } from "@/lib/pokemon/validator";
import { evaluatePromptSafety } from "@/lib/security/prompt-safety";
import { getClientKey, routeRateLimiter } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  prompt: z.string().min(10).max(400)
});

const CREATE_LIMIT = 10;
const CREATE_WINDOW_MS = 60_000;

const normalizeBehaviorByFlag = <T extends { moves: Array<{ behaviorVersion?: "v1" | "v2"; behaviorProgram?: unknown }> }>(
  draft: T
): T => {
  const enableBehaviorV2 = getEnv().ENABLE_BEHAVIOR_V2 === "true";
  if (enableBehaviorV2) {
    return draft;
  }

  return {
    ...draft,
    moves: draft.moves.map((move) => ({
      ...move,
      behaviorVersion: "v1",
      behaviorProgram: null
    }))
  } as T;
};

const isCodexGenerationError = (error: unknown): error is CodexGenerationError => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as { code?: unknown; reasons?: unknown };
  return typeof maybeError.code === "string" && Array.isArray(maybeError.reasons);
};

const generateDraftWithSchemaRetry = async (
  prompt: string,
  rejectionReasons?: string[]
) => {
  try {
    return normalizeBehaviorByFlag(await generatePokemonDraftWithCodex({ prompt, rejectionReasons }));
  } catch (error) {
    if (!isCodexGenerationError(error) || error.code !== "INVALID_BEHAVIOR_SCHEMA") {
      throw error;
    }

    // If this call already had rejection reasons, it is already a repair attempt.
    if (rejectionReasons && rejectionReasons.length > 0) {
      throw error;
    }

    const retryReasons =
      error.reasons.length > 0 ? error.reasons : ["Generated output failed schema validation."];

    return normalizeBehaviorByFlag(
      await generatePokemonDraftWithCodex({
        prompt,
        rejectionReasons: retryReasons
      })
    );
  }
};

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const clientKey = getClientKey(request.headers.get("x-forwarded-for"));
  const rate = routeRateLimiter.consume(`create:${clientKey}`, CREATE_LIMIT, CREATE_WINDOW_MS);

  if (!rate.allowed) {
    logWarn({ event: "create.rate_limited", requestId, clientKey, retryAfterMs: rate.retryAfterMs });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again shortly.", code: "RATE_LIMITED", retryable: true },
      {
        status: 429,
        headers: {
          "retry-after": String(Math.ceil(rate.retryAfterMs / 1000))
        }
      }
    );
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompt payload", code: "INVALID_REQUEST", retryable: false }, { status: 400 });
  }

  const promptSafety = evaluatePromptSafety(parsed.data.prompt);
  if (!promptSafety.safe) {
    logWarn({ event: "create.prompt_blocked", requestId, clientKey });
    return NextResponse.json({ error: promptSafety.reason, code: "PROMPT_POLICY_BLOCKED", retryable: false }, { status: 422 });
  }

  const moderation = await moderateGenerationPrompt(parsed.data.prompt);
  if (!moderation.allowed) {
    logWarn({ event: "create.prompt_blocked_moderation", requestId, clientKey });
    return NextResponse.json({ error: moderation.reason, code: "PROMPT_POLICY_BLOCKED", retryable: false }, { status: 422 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED", retryable: true }, { status: 401 });
  }

  logInfo({ event: "create.started", requestId, userId: user.id, clientKey });

  try {
    const draft = await generateDraftWithSchemaRetry(parsed.data.prompt);
    const validation = validatePokemonDraft(draft);

    if (!validation.passed) {
      logWarn({ event: "create.validation_failed", requestId, reasons: validation.reasons });
      const repairedDraft = await generateDraftWithSchemaRetry(parsed.data.prompt, validation.reasons);
      const repairedValidation = validatePokemonDraft(repairedDraft);
      const repairedBalance = repairedValidation.passed ? validateBalance(repairedDraft) : null;

      if (!repairedValidation.passed || !repairedBalance?.passed) {
        return NextResponse.json(
          {
            error: "Generated pokemon failed validation",
            code: repairedValidation.code ?? "GENERATION_REPAIR_FAILED",
            reasons: repairedValidation.passed ? repairedBalance?.reasons ?? validation.reasons : repairedValidation.reasons,
            retryable: true
          },
          { status: 422 }
        );
      }

      repairedDraft.balanceReport = repairedBalance.report as unknown as Record<string, unknown>;
      const images = await generatePokemonImagePair(repairedDraft.name, parsed.data.prompt);
      const repairedPersisted = await persistGeneratedPokemon({
        prompt: parsed.data.prompt,
        draft: repairedDraft,
        frontSprite: images.frontPng,
        backSprite: images.backPng,
        ownerUserId: user.id
      });

      return NextResponse.json(
        {
          pokemon: repairedPersisted.pokemon,
          validation: repairedValidation,
          balance: repairedBalance.report
        },
        { status: 201 }
      );
    }

    const balance = validateBalance(draft);
    if (!balance.passed) {
      logWarn({ event: "create.balance_failed", requestId, reasons: balance.reasons, report: balance.report });
      const repairedDraft = await generateDraftWithSchemaRetry(parsed.data.prompt, balance.reasons);
      const repairedValidation = validatePokemonDraft(repairedDraft);
      const repairedBalance = repairedValidation.passed ? validateBalance(repairedDraft) : null;
      const repairedBalanceReport = repairedBalance?.report;

      if (!repairedValidation.passed || !repairedBalance?.passed || !repairedBalanceReport) {
        return NextResponse.json(
          {
            error: "Generated pokemon failed balance checks",
            code: !repairedValidation.passed ? repairedValidation.code ?? "INVALID_BEHAVIOR_SCHEMA" : "SIMULATION_BALANCE_FAILED",
            reasons: !repairedValidation.passed ? repairedValidation.reasons : repairedBalance?.reasons ?? balance.reasons,
            retryable: true
          },
          { status: 422 }
        );
      }

      repairedDraft.balanceReport = repairedBalanceReport as unknown as Record<string, unknown>;
      const images = await generatePokemonImagePair(repairedDraft.name, parsed.data.prompt);
      const repairedPersisted = await persistGeneratedPokemon({
        prompt: parsed.data.prompt,
        draft: repairedDraft,
        frontSprite: images.frontPng,
        backSprite: images.backPng,
        ownerUserId: user.id
      });

      return NextResponse.json(
        {
          pokemon: repairedPersisted.pokemon,
          validation: repairedValidation,
          balance: repairedBalanceReport
        },
        { status: 201 }
      );
    }

    draft.balanceReport = balance.report as unknown as Record<string, unknown>;
    const images = await generatePokemonImagePair(draft.name, parsed.data.prompt);
    const persisted = await persistGeneratedPokemon({
      prompt: parsed.data.prompt,
      draft,
      frontSprite: images.frontPng,
      backSprite: images.backPng,
      ownerUserId: user.id
    });

    logInfo({
      event: "create.completed",
      requestId,
      userId: user.id,
      pokemonId: persisted.pokemon.id,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json(
      {
        pokemon: persisted.pokemon,
        validation,
        balance: balance.report
      },
      { status: 201 }
    );
  } catch (error) {
    if (isCodexGenerationError(error)) {
      logWarn({
        event: "create.schema_failed",
        requestId,
        userId: user.id,
        reasons: error.reasons,
        durationMs: Date.now() - startedAt
      });

      return NextResponse.json(
        {
          error: "Generated output did not match required schema.",
          code: error.code,
          reasons: error.reasons,
          retryable: true
        },
        { status: 422 }
      );
    }

    const message = error instanceof Error ? error.message : "Pokemon creation failed";
    logError({ event: "create.failed", requestId, userId: user.id, error: message, durationMs: Date.now() - startedAt });
    return NextResponse.json(
      {
        error: "There was an error creating your Pokemon. Please try again.",
        code: "GENERATION_FAILED",
        retryable: true
      },
      { status: 500 }
    );
  }
}
