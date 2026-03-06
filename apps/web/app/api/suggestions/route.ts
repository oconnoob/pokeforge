import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { moderateGenerationPrompt } from "@/lib/ai/moderation";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";
import { evaluatePromptSafety } from "@/lib/security/prompt-safety";
import { getClientKey, routeRateLimiter } from "@/lib/security/rate-limit";
import { dispatchSuggestionWorkflow, isSuggestionAutomationEnabled } from "@/lib/suggestions/github-dispatch";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  message: z.string().min(10).max(1200)
});

const SUGGESTION_LIMIT = 5;
const SUGGESTION_WINDOW_MS = 10 * 60_000;

const toSafeErrorText = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
};

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const clientKey = getClientKey(request.headers.get("x-forwarded-for"));
  const rate = routeRateLimiter.consume(`suggestions:${clientKey}`, SUGGESTION_LIMIT, SUGGESTION_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please try again shortly.",
        code: "RATE_LIMITED",
        retryable: true
      },
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
    return NextResponse.json({ error: "Invalid suggestion payload.", code: "INVALID_REQUEST", retryable: false }, { status: 400 });
  }

  const promptSafety = evaluatePromptSafety(parsed.data.message);
  if (!promptSafety.safe) {
    return NextResponse.json({ error: promptSafety.reason, code: "PROMPT_POLICY_BLOCKED", retryable: false }, { status: 422 });
  }

  const moderation = await moderateGenerationPrompt(parsed.data.message);
  if (!moderation.allowed) {
    return NextResponse.json({ error: moderation.reason, code: "PROMPT_POLICY_BLOCKED", retryable: false }, { status: 422 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED", retryable: true }, { status: 401 });
  }

  const suggestionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("suggestions").insert({
    id: suggestionId,
    owner_user_id: user.id,
    message: parsed.data.message,
    status: "queued",
    created_at: now,
    updated_at: now
  });

  if (insertError) {
    logError({
      event: "suggestions.insert_failed",
      requestId,
      userId: user.id,
      error: insertError.message
    });
    return NextResponse.json(
      {
        error: "Unable to store suggestion.",
        code: "SUGGESTION_STORE_FAILED",
        retryable: true
      },
      { status: 500 }
    );
  }

  if (!isSuggestionAutomationEnabled()) {
    logInfo({
      event: "suggestions.queued",
      requestId,
      userId: user.id,
      suggestionId,
      automation: "disabled"
    });
    return NextResponse.json(
      {
        suggestion: { id: suggestionId, status: "queued" },
        automationStarted: false
      },
      { status: 202 }
    );
  }

  try {
    await dispatchSuggestionWorkflow({
      suggestionId,
      message: parsed.data.message,
      userId: user.id,
      userEmail: user.email ?? null
    });

    const updatedAt = new Date().toISOString();
    await supabase.from("suggestions").update({ status: "running", updated_at: updatedAt }).eq("id", suggestionId);

    logInfo({
      event: "suggestions.dispatched",
      requestId,
      userId: user.id,
      suggestionId,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json(
      {
        suggestion: { id: suggestionId, status: "running" },
        automationStarted: true
      },
      { status: 202 }
    );
  } catch (error) {
    const safeError = toSafeErrorText(error);
    await supabase
      .from("suggestions")
      .update({
        status: "failed",
        error_message: safeError,
        updated_at: new Date().toISOString()
      })
      .eq("id", suggestionId);

    logWarn({
      event: "suggestions.dispatch_failed",
      requestId,
      userId: user.id,
      suggestionId,
      error: safeError
    });

    return NextResponse.json(
      {
        suggestion: { id: suggestionId, status: "failed" },
        automationStarted: false,
        error: "Suggestion was saved, but automation could not be started.",
        code: "AUTOMATION_DISPATCH_FAILED",
        retryable: true
      },
      { status: 202 }
    );
  }
}
