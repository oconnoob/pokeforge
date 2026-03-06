import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/suggestions/route";
import { routeRateLimiter } from "@/lib/security/rate-limit";

const mockModerateGenerationPrompt = vi.hoisted(() => vi.fn());
const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());
const mockDispatchSuggestionWorkflow = vi.hoisted(() => vi.fn());
const mockIsSuggestionAutomationEnabled = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/moderation", () => ({
  moderateGenerationPrompt: mockModerateGenerationPrompt
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient
}));

vi.mock("@/lib/suggestions/github-dispatch", () => ({
  dispatchSuggestionWorkflow: mockDispatchSuggestionWorkflow,
  isSuggestionAutomationEnabled: mockIsSuggestionAutomationEnabled
}));

const buildRequest = (message: string, client = "suggestion-test-client") =>
  new NextRequest("http://localhost:3000/api/suggestions", {
    method: "POST",
    body: JSON.stringify({ message }),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": client
    }
  });

const createSupabaseMock = (userId: string | null, options?: { insertError?: { message: string } | null }) => {
  const insertMock = vi.fn().mockResolvedValue({ error: options?.insertError ?? null });
  const updateEqMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
  const fromMock = vi.fn().mockReturnValue({
    insert: insertMock,
    update: updateMock
  });

  return {
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: userId ? { id: userId, email: `${userId}@example.com` } : null } })
      },
      from: fromMock
    },
    fromMock
  };
};

describe("POST /api/suggestions", () => {
  beforeEach(() => {
    routeRateLimiter.clear();
    mockModerateGenerationPrompt.mockResolvedValue({ allowed: true });
    mockDispatchSuggestionWorkflow.mockResolvedValue(undefined);
    mockIsSuggestionAutomationEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid suggestion payload", async () => {
    const response = await POST(buildRequest("too short", "suggestion-invalid"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.code).toBe("INVALID_REQUEST");
  });

  it("requires authenticated user", async () => {
    const { supabase } = createSupabaseMock(null);
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await POST(
      buildRequest("The login button is hard to click on Safari. Please investigate.", "suggestion-auth")
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.code).toBe("AUTH_REQUIRED");
  });

  it("stores suggestion and returns queued when automation is disabled", async () => {
    const { supabase, fromMock } = createSupabaseMock("user-queued");
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockIsSuggestionAutomationEnabled.mockReturnValue(false);

    const response = await POST(
      buildRequest("The battle prep cards could use clearer labels for selected pokemon.", "suggestion-queued")
    );
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json.automationStarted).toBe(false);
    expect(json.suggestion.status).toBe("queued");
    expect(fromMock).toHaveBeenCalledWith("suggestions");
    expect(mockDispatchSuggestionWorkflow).not.toHaveBeenCalled();
  });

  it("dispatches automation and marks suggestion running when enabled", async () => {
    const { supabase } = createSupabaseMock("user-running");
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockIsSuggestionAutomationEnabled.mockReturnValue(true);
    mockDispatchSuggestionWorkflow.mockResolvedValue(undefined);

    const response = await POST(
      buildRequest("Please rebalance fire types, they feel too strong in early turns.", "suggestion-running")
    );
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json.automationStarted).toBe(true);
    expect(json.suggestion.status).toBe("running");
    expect(mockDispatchSuggestionWorkflow).toHaveBeenCalledTimes(1);
  });

  it("still dispatches automation when suggestions table insert fails", async () => {
    const { supabase } = createSupabaseMock("user-running-no-table", {
      insertError: { message: "relation \"suggestions\" does not exist" }
    });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockIsSuggestionAutomationEnabled.mockReturnValue(true);
    mockDispatchSuggestionWorkflow.mockResolvedValue(undefined);

    const response = await POST(
      buildRequest("Please improve controller navigation on the create page.", "suggestion-running-no-table")
    );
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json.automationStarted).toBe(true);
    expect(json.suggestion.status).toBe("running");
    expect(mockDispatchSuggestionWorkflow).toHaveBeenCalledTimes(1);
  });

  it("keeps saved suggestion but reports failed dispatch when automation start fails", async () => {
    const { supabase } = createSupabaseMock("user-failed");
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockIsSuggestionAutomationEnabled.mockReturnValue(true);
    mockDispatchSuggestionWorkflow.mockRejectedValue(new Error("GitHub dispatch failed"));

    const response = await POST(
      buildRequest("The generated pokemon card should show badges in a better location.", "suggestion-failed")
    );
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json.automationStarted).toBe(false);
    expect(json.suggestion.status).toBe("failed");
    expect(json.code).toBe("AUTOMATION_DISPATCH_FAILED");
  });
});
