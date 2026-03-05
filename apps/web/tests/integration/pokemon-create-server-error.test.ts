import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/pokemon/create/route";

const mockGeneratePokemonDraftWithCodex = vi.hoisted(() => vi.fn());
const mockReviewMoveFunctionsWithCodex = vi.hoisted(() => vi.fn());
const mockModerateGenerationPrompt = vi.hoisted(() => vi.fn());
const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/codex", () => ({
  generatePokemonDraftWithCodex: mockGeneratePokemonDraftWithCodex,
  reviewMoveFunctionsWithCodex: mockReviewMoveFunctionsWithCodex
}));

vi.mock("@/lib/ai/moderation", () => ({
  moderateGenerationPrompt: mockModerateGenerationPrompt
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient
}));

describe("POST /api/pokemon/create internal error handling", () => {
  it("hides internal error details from response payload", async () => {
    mockModerateGenerationPrompt.mockResolvedValue({ allowed: true });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } })
      }
    });

    mockGeneratePokemonDraftWithCodex.mockRejectedValueOnce(
      new Error("Codex API request failed: { huge internal provider payload }")
    );

    const request = new NextRequest("http://localhost:3000/api/pokemon/create", {
      method: "POST",
      body: JSON.stringify({ prompt: "Create a fierce but balanced electric tiger." }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "server-error-test-client"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.code).toBe("GENERATION_FAILED");
    expect(json.error).toBe("There was an error creating your Pokemon. Please try again.");
    expect(String(json.error)).not.toContain("provider payload");
  });
});
