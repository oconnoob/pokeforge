import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/suggestions/[suggestionId]/status/route";

const mockCreateSupabaseAdminClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mockCreateSupabaseAdminClient
}));

const buildRequest = (payload: unknown, secret?: string) =>
  new NextRequest("http://localhost:3000/api/suggestions/s-1/status", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-suggestion-webhook-secret": secret } : {})
    }
  });

const createAdminUpdateMock = ({ data, error }: { data: unknown; error: { message: string; code?: string } | null }) => {
  const maybeSingleMock = vi.fn().mockResolvedValue({ data, error });
  const selectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const eqMock = vi.fn().mockReturnValue({ select: selectMock });
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
  const fromMock = vi.fn().mockReturnValue({ update: updateMock });

  return {
    admin: { from: fromMock },
    fromMock,
    updateMock,
    eqMock,
    selectMock,
    maybeSingleMock
  };
};

describe("POST /api/suggestions/:suggestionId/status", () => {
  const previousSecret = process.env.SUGGESTION_STATUS_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.SUGGESTION_STATUS_WEBHOOK_SECRET = "test-secret-12345";
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.SUGGESTION_STATUS_WEBHOOK_SECRET;
    } else {
      process.env.SUGGESTION_STATUS_WEBHOOK_SECRET = previousSecret;
    }
    vi.clearAllMocks();
  });

  it("rejects requests without a valid webhook secret", async () => {
    const response = await POST(buildRequest({ status: "running" }), {
      params: Promise.resolve({ suggestionId: "s-1" })
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid status payloads", async () => {
    const response = await POST(buildRequest({ status: "unknown" }, "test-secret-12345"), {
      params: Promise.resolve({ suggestionId: "s-1" })
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.code).toBe("INVALID_REQUEST");
  });

  it("acknowledges callback when suggestion is missing", async () => {
    const chain = createAdminUpdateMock({ data: null, error: null });
    mockCreateSupabaseAdminClient.mockReturnValue(chain.admin);

    const response = await POST(buildRequest({ status: "failed", errorMessage: "No changes required" }, "test-secret-12345"), {
      params: Promise.resolve({ suggestionId: "missing" })
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.acknowledged).toBe(true);
    expect(json.persisted).toBe(false);
    expect(chain.fromMock).toHaveBeenCalledWith("suggestions");
    expect(chain.eqMock).toHaveBeenCalledWith("id", "missing");
  });

  it("returns 500 if db update fails", async () => {
    const chain = createAdminUpdateMock({ data: null, error: { message: "db failed" } });
    mockCreateSupabaseAdminClient.mockReturnValue(chain.admin);

    const response = await POST(buildRequest({ status: "running" }, "test-secret-12345"), {
      params: Promise.resolve({ suggestionId: "s-db" })
    });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.code).toBe("STATUS_UPDATE_FAILED");
  });

  it("updates suggestion status and metadata", async () => {
    const chain = createAdminUpdateMock({
      data: {
        id: "s-ok",
        status: "pr_opened",
        github_pr_url: "https://github.com/example/pokeforge/pull/77",
        github_branch: "codex/suggestion-s-ok",
        github_run_url: "https://github.com/example/pokeforge/actions/runs/888",
        error_message: null
      },
      error: null
    });

    mockCreateSupabaseAdminClient.mockReturnValue(chain.admin);

    const response = await POST(
      buildRequest(
        {
          status: "pr_opened",
          githubPrUrl: "https://github.com/example/pokeforge/pull/77",
          githubBranch: "codex/suggestion-s-ok",
          githubRunUrl: "https://github.com/example/pokeforge/actions/runs/888"
        },
        "test-secret-12345"
      ),
      {
        params: Promise.resolve({ suggestionId: "s-ok" })
      }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.acknowledged).toBe(true);
    expect(json.persisted).toBe(true);
    expect(json.suggestion.status).toBe("pr_opened");
    expect(chain.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pr_opened",
        github_pr_url: "https://github.com/example/pokeforge/pull/77",
        github_branch: "codex/suggestion-s-ok"
      })
    );
  });

  it("acknowledges callback when table does not exist", async () => {
    const chain = createAdminUpdateMock({ data: null, error: { message: "relation suggestions does not exist", code: "42P01" } });
    mockCreateSupabaseAdminClient.mockReturnValue(chain.admin);

    const response = await POST(buildRequest({ status: "running" }, "test-secret-12345"), {
      params: Promise.resolve({ suggestionId: "s-no-table" })
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.acknowledged).toBe(true);
    expect(json.persisted).toBe(false);
  });
});
