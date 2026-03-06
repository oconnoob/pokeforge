import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/config/env";
import { logWarn } from "@/lib/observability/logger";

const statusSchema = z.object({
  status: z.enum(["running", "pr_opened", "failed"]),
  githubPrUrl: z.string().url().optional(),
  githubBranch: z.string().min(1).max(255).optional(),
  githubRunUrl: z.string().url().optional(),
  errorMessage: z.string().max(1000).optional()
});

const hasValidWebhookSecret = (request: NextRequest) => {
  const secret = getEnv().SUGGESTION_STATUS_WEBHOOK_SECRET;
  if (!secret || secret.length < 12) {
    return false;
  }
  const provided = request.headers.get("x-suggestion-webhook-secret");
  return Boolean(provided && provided === secret);
};

export async function POST(request: NextRequest, context: { params: Promise<{ suggestionId: string }> }) {
  if (!hasValidWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED", retryable: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status payload.", code: "INVALID_REQUEST", retryable: false }, { status: 400 });
  }

  const { suggestionId } = await context.params;
  const admin = createSupabaseAdminClient();
  const update = {
    status: parsed.data.status,
    github_pr_url: parsed.data.githubPrUrl ?? null,
    github_branch: parsed.data.githubBranch ?? null,
    github_run_url: parsed.data.githubRunUrl ?? null,
    error_message: parsed.data.errorMessage ?? null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await admin
    .from("suggestions")
    .update(update)
    .eq("id", suggestionId)
    .select("id,status,github_pr_url,github_branch,github_run_url,error_message")
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      // Suggestions table is optional when running dispatch-only mode.
      return NextResponse.json({ acknowledged: true, persisted: false });
    }
    logWarn({
      event: "suggestions.status_update_failed",
      suggestionId,
      error: error.message
    });
    return NextResponse.json({ error: "Unable to update suggestion status.", code: "STATUS_UPDATE_FAILED", retryable: true }, { status: 500 });
  }

  if (!data) {
    // Dispatch-only mode may not persist rows. Treat as acknowledged.
    return NextResponse.json({ acknowledged: true, persisted: false });
  }

  return NextResponse.json({ acknowledged: true, persisted: true, suggestion: data });
}
