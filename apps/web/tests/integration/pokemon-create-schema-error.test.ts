import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CodexGenerationError } from "@/lib/ai/codex";
import { POST } from "@/app/api/pokemon/create/route";

const mockGeneratePokemonDraftWithCodex = vi.hoisted(() => vi.fn());
const mockModerateGenerationPrompt = vi.hoisted(() => vi.fn());
const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/codex", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/codex")>("@/lib/ai/codex");
  return {
    ...actual,
    generatePokemonDraftWithCodex: mockGeneratePokemonDraftWithCodex
  };
});

vi.mock("@/lib/ai/moderation", () => ({
  moderateGenerationPrompt: mockModerateGenerationPrompt
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient
}));

describe("POST /api/pokemon/create schema handling", () => {
  it("returns structured 422 when model output schema is invalid after repair attempt", async () => {
    mockModerateGenerationPrompt.mockResolvedValue({ allowed: true });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } })
      }
    });

    mockGeneratePokemonDraftWithCodex
      .mockRejectedValueOnce(
        new CodexGenerationError("Generated output failed schema validation.", "INVALID_BEHAVIOR_SCHEMA", [
          "secondaryType: invalid structured value"
        ])
      )
      .mockRejectedValueOnce(
        new CodexGenerationError("Generated output failed schema validation.", "INVALID_BEHAVIOR_SCHEMA", [
          "moves.1.behaviorProgram.steps.0: invalid structured value"
        ])
      );

    const request = new NextRequest("http://localhost:3000/api/pokemon/create", {
      method: "POST",
      body: JSON.stringify({ prompt: "Make a balanced ice pokemon that can defend and counter." }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "schema-error-test-client"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.code).toBe("INVALID_BEHAVIOR_SCHEMA");
    expect(json.error).toBe("Generated output did not match required schema.");
    expect(json.retryable).toBe(true);
    expect(Array.isArray(json.reasons)).toBe(true);
    expect(json.reasons[0]).toContain("moves.1.behaviorProgram.steps.0");
    expect(mockGeneratePokemonDraftWithCodex).toHaveBeenCalledTimes(2);
    expect(mockGeneratePokemonDraftWithCodex.mock.calls[1]?.[0]).toMatchObject({
      rejectionReasons: ["secondaryType: invalid structured value"]
    });
  });
});
