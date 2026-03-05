import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePokemonDraftWithCodex } from "@/lib/ai/codex";
import { generatePokemonImagePair } from "@/lib/ai/images";
import { moderateGenerationPrompt } from "@/lib/ai/moderation";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";
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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const clientKey = getClientKey(request.headers.get("x-forwarded-for"));
  const rate = routeRateLimiter.consume(`create:${clientKey}`, CREATE_LIMIT, CREATE_WINDOW_MS);

  if (!rate.allowed) {
    logWarn({ event: "create.rate_limited", requestId, clientKey, retryAfterMs: rate.retryAfterMs });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again shortly." },
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
    return NextResponse.json({ error: "Invalid prompt payload" }, { status: 400 });
  }

  const promptSafety = evaluatePromptSafety(parsed.data.prompt);
  if (!promptSafety.safe) {
    logWarn({ event: "create.prompt_blocked", requestId, clientKey });
    return NextResponse.json({ error: promptSafety.reason }, { status: 422 });
  }

  const moderation = await moderateGenerationPrompt(parsed.data.prompt);
  if (!moderation.allowed) {
    logWarn({ event: "create.prompt_blocked_moderation", requestId, clientKey });
    return NextResponse.json({ error: moderation.reason }, { status: 422 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  logInfo({ event: "create.started", requestId, userId: user.id, clientKey });

  try {
    const draft = await generatePokemonDraftWithCodex({ prompt: parsed.data.prompt });
    const validation = validatePokemonDraft(draft);

    if (!validation.passed) {
      logWarn({ event: "create.validation_failed", requestId, reasons: validation.reasons });
      return NextResponse.json(
        {
          error: "Generated pokemon failed validation",
          reasons: validation.reasons
        },
        { status: 422 }
      );
    }

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
        validation
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pokemon creation failed";
    logError({ event: "create.failed", requestId, userId: user.id, error: message, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
