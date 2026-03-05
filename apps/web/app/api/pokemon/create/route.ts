import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CodexGenerationError, generatePokemonDraftWithCodex, reviewMoveFunctionsWithCodex } from "@/lib/ai/codex";
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

const normalizeBehaviorByFlag = <
  T extends {
    moves: Array<{
      id: string;
      name: string;
      behaviorVersion?: "v1" | "v2";
      behaviorProgram?: unknown;
      behaviorFunction?: string | null;
      behaviorFunctionReview?: Record<string, unknown> | null;
    }>;
  }
>(
  draft: T
): T => {
  const enableBehaviorV2 = getEnv().ENABLE_BEHAVIOR_V2 === "true";
  const enableFunctionBlobs = getEnv().ENABLE_MOVE_FUNCTION_BLOBS === "true";
  if (enableBehaviorV2) {
    return {
      ...draft,
      moves: draft.moves.map((move) => ({
        ...move,
        behaviorFunction: enableFunctionBlobs ? move.behaviorFunction ?? null : null,
        behaviorFunctionReview: enableFunctionBlobs ? move.behaviorFunctionReview ?? null : null
      }))
    } as T;
  }

  return {
    ...draft,
    moves: draft.moves.map((move) => ({
      ...move,
      behaviorVersion: "v1",
      behaviorProgram: null,
      behaviorFunction: enableFunctionBlobs ? move.behaviorFunction ?? null : null,
      behaviorFunctionReview: enableFunctionBlobs ? move.behaviorFunctionReview ?? null : null
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

const reviewDraftFunctionSecurity = async <
  T extends {
    moves: Array<{
      id: string;
      name: string;
      behaviorFunction?: string | null;
      behaviorFunctionReview?: Record<string, unknown> | null;
    }>;
  }
>(
  draft: T
): Promise<{ draft: T; approved: boolean; reasons: string[] }> => {
  const enableFunctionBlobs = getEnv().ENABLE_MOVE_FUNCTION_BLOBS === "true";
  if (!enableFunctionBlobs) {
    return {
      draft,
      approved: true,
      reasons: []
    };
  }

  const review = await reviewMoveFunctionsWithCodex(draft.moves);
  const reviewedDraft = {
    ...draft,
    moves: draft.moves.map((move) => ({
      ...move,
      behaviorFunctionReview: {
        reviewer: review.reviewer,
        model: review.model,
        approved: review.approved,
        reasons: review.reasons,
        reviewedAt: new Date().toISOString()
      }
    }))
  } as T;

  return {
    draft: reviewedDraft,
    approved: review.approved,
    reasons: review.reasons
  };
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
    const strictBalanceGate = getEnv().ENABLE_STRICT_BALANCE_GATE === "true";

    const persistAndRespond = async ({
      draft,
      validation,
      balanceReport
    }: {
      draft: Awaited<ReturnType<typeof generateDraftWithSchemaRetry>>;
      validation: ReturnType<typeof validatePokemonDraft>;
      balanceReport?: Record<string, unknown>;
    }) => {
      draft.balanceReport = balanceReport;
      const images = await generatePokemonImagePair(draft.name, parsed.data.prompt);
      const persisted = await persistGeneratedPokemon({
        prompt: parsed.data.prompt,
        draft,
        frontSprite: images.frontPng,
        backSprite: images.backPng,
        ownerUserId: user.id
      });

      return NextResponse.json(
        {
          pokemon: persisted.pokemon,
          validation,
          balance: balanceReport
        },
        { status: 201 }
      );
    };

    const draft = await generateDraftWithSchemaRetry(parsed.data.prompt);
    const validation = validatePokemonDraft(draft);

    if (!validation.passed) {
      logWarn({ event: "create.validation_failed", requestId, reasons: validation.reasons });
      const repairedDraft = await generateDraftWithSchemaRetry(parsed.data.prompt, validation.reasons);
      const repairedValidation = validatePokemonDraft(repairedDraft);

      if (!repairedValidation.passed) {
        return NextResponse.json(
          {
            error: "Generated pokemon failed validation",
            code: repairedValidation.code ?? "GENERATION_REPAIR_FAILED",
            reasons: repairedValidation.reasons,
            retryable: true
          },
          { status: 422 }
        );
      }

      const repairedSecurityReview = await reviewDraftFunctionSecurity(repairedDraft);
      if (!repairedSecurityReview.approved) {
        const securityRetryDraft = await generateDraftWithSchemaRetry(
          parsed.data.prompt,
          repairedSecurityReview.reasons.map((reason) => `Function security review failed: ${reason}`)
        );
        const securityRetryValidation = validatePokemonDraft(securityRetryDraft);
        if (!securityRetryValidation.passed) {
          return NextResponse.json(
            {
              error: "Generated pokemon failed validation",
              code: securityRetryValidation.code ?? "INVALID_BEHAVIOR_SCHEMA",
              reasons: securityRetryValidation.reasons,
              retryable: true
            },
            { status: 422 }
          );
        }
        const securityRetryReview = await reviewDraftFunctionSecurity(securityRetryDraft);
        if (!securityRetryReview.approved) {
          return NextResponse.json(
            {
              error: "Generated move functions failed security review",
              code: "FUNCTION_SECURITY_REVIEW_FAILED",
              reasons: securityRetryReview.reasons,
              retryable: true
            },
            { status: 422 }
          );
        }

        return persistAndRespond({
          draft: securityRetryReview.draft,
          validation: securityRetryValidation,
          balanceReport: {
            mode: "soft",
            enforced: false,
            reason: "strict balance gate disabled",
            generatedAt: new Date().toISOString()
          }
        });
      }

      if (strictBalanceGate) {
        const repairedBalance = validateBalance(repairedSecurityReview.draft);
        if (!repairedBalance.passed) {
          return NextResponse.json(
            {
              error: "Generated pokemon failed balance checks",
              code: "SIMULATION_BALANCE_FAILED",
              reasons: repairedBalance.reasons,
              retryable: true
            },
            { status: 422 }
          );
        }

        return persistAndRespond({
          draft: repairedSecurityReview.draft,
          validation: repairedValidation,
          balanceReport: repairedBalance.report as unknown as Record<string, unknown>
        });
      }

      return persistAndRespond({
        draft: repairedSecurityReview.draft,
        validation: repairedValidation,
        balanceReport: {
          mode: "soft",
          enforced: false,
          reason: "strict balance gate disabled",
          generatedAt: new Date().toISOString()
        }
      });
    }

    const securityReview = await reviewDraftFunctionSecurity(draft);
    if (!securityReview.approved) {
      const securityRetryDraft = await generateDraftWithSchemaRetry(
        parsed.data.prompt,
        securityReview.reasons.map((reason) => `Function security review failed: ${reason}`)
      );
      const securityRetryValidation = validatePokemonDraft(securityRetryDraft);
      if (!securityRetryValidation.passed) {
        return NextResponse.json(
          {
            error: "Generated pokemon failed validation",
            code: securityRetryValidation.code ?? "INVALID_BEHAVIOR_SCHEMA",
            reasons: securityRetryValidation.reasons,
            retryable: true
          },
          { status: 422 }
        );
      }
      const securityRetryReview = await reviewDraftFunctionSecurity(securityRetryDraft);
      if (!securityRetryReview.approved) {
        return NextResponse.json(
          {
            error: "Generated move functions failed security review",
            code: "FUNCTION_SECURITY_REVIEW_FAILED",
            reasons: securityRetryReview.reasons,
            retryable: true
          },
          { status: 422 }
        );
      }

      return persistAndRespond({
        draft: securityRetryReview.draft,
        validation: securityRetryValidation,
        balanceReport: {
          mode: "soft",
          enforced: false,
          reason: "strict balance gate disabled",
          generatedAt: new Date().toISOString()
        }
      });
    }

    if (strictBalanceGate) {
      const balance = validateBalance(securityReview.draft);
      if (!balance.passed) {
        logWarn({ event: "create.balance_failed", requestId, reasons: balance.reasons, report: balance.report });
        return NextResponse.json(
          {
            error: "Generated pokemon failed balance checks",
            code: "SIMULATION_BALANCE_FAILED",
            reasons: balance.reasons,
            retryable: true
          },
          { status: 422 }
        );
      }

      const strictResult = await persistAndRespond({
        draft: securityReview.draft,
        validation,
        balanceReport: balance.report as unknown as Record<string, unknown>
      });

      logInfo({
        event: "create.completed",
        requestId,
        userId: user.id,
        durationMs: Date.now() - startedAt
      });

      return strictResult;
    }

    const softResult = await persistAndRespond({
      draft: securityReview.draft,
      validation,
      balanceReport: {
        mode: "soft",
        enforced: false,
        reason: "strict balance gate disabled",
        generatedAt: new Date().toISOString()
      }
    });

    logInfo({
      event: "create.completed",
      requestId,
      userId: user.id,
      durationMs: Date.now() - startedAt
    });

    return softResult;
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
          error:
            error.code === "FUNCTION_SECURITY_REVIEW_FAILED"
              ? "Generated move functions failed security review."
              : "Generated output did not match required schema.",
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
