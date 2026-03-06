import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/suggestions/route";

const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient
}));

interface SuggestionRow {
  id: string;
  message: string;
  status: "queued" | "running" | "pr_opened" | "failed";
  github_pr_url: string | null;
  github_branch: string | null;
  github_run_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const createSuggestionQuery = ({ data, error }: { data: SuggestionRow[] | null; error: { message: string } | null }) => {
  const limitMock = vi.fn().mockResolvedValue({ data, error });
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
  const eqMock = vi.fn().mockReturnValue({ order: orderMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

  return {
    selectMock,
    eqMock,
    orderMock,
    limitMock
  };
};

describe("GET /api/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requires an authenticated user", async () => {
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null } })
      }
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.code).toBe("AUTH_REQUIRED");
  });

  it("returns most recent suggestions for the authenticated user", async () => {
    const query = createSuggestionQuery({
      data: [
        {
          id: "s-1",
          message: "Button focus ring is too faint in battle prep.",
          status: "pr_opened",
          github_pr_url: "https://github.com/example/pokeforge/pull/42",
          github_branch: "codex/suggestion-s-1",
          github_run_url: "https://github.com/example/pokeforge/actions/runs/123",
          error_message: null,
          created_at: "2026-03-05T00:00:00.000Z",
          updated_at: "2026-03-05T00:02:00.000Z"
        }
      ],
      error: null
    });

    const fromMock = vi.fn().mockReturnValue({
      select: query.selectMock
    });

    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } })
      },
      from: fromMock
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.suggestions).toHaveLength(1);
    expect(json.suggestions[0].id).toBe("s-1");
    expect(fromMock).toHaveBeenCalledWith("suggestions");
    expect(query.eqMock).toHaveBeenCalledWith("owner_user_id", "user-1");
    expect(query.orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.limitMock).toHaveBeenCalledWith(10);
  });

  it("returns empty list if suggestions query fails", async () => {
    const query = createSuggestionQuery({
      data: null,
      error: { message: "db unavailable" }
    });

    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-err" } } })
      },
      from: vi.fn().mockReturnValue({ select: query.selectMock })
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.suggestions).toEqual([]);
  });
});
