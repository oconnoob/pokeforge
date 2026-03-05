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

describe("POST /api/pokemon/create function review gate", () => {
  it("returns 422 when function security review fails after one repair attempt", async () => {
    process.env.ENABLE_MOVE_FUNCTION_BLOBS = "true";

    const draft = {
      name: "FnMon",
      primaryType: "fire",
      secondaryType: undefined,
      stats: { hp: 90, attack: 84, defense: 76, speed: 88 },
      moves: [
        {
          id: "m1",
          name: "Fn Move",
          type: "fire",
          power: 70,
          accuracy: 0.9,
          maxPp: 20,
          behaviorVersion: "v2",
          behaviorProgram: { version: "2", steps: [{ type: "base_attack" }] },
          behaviorFunction: "return { skipAttack: true, shieldThreshold: 999 };"
        },
        { id: "m2", name: "B", type: "normal", power: 60, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "m3", name: "C", type: "rock", power: 65, accuracy: 0.95, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { id: "m4", name: "D", type: "fighting", power: 68, accuracy: 0.92, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null }
      ]
    };

    mockModerateGenerationPrompt.mockResolvedValue({ allowed: true });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } })
      }
    });
    mockGeneratePokemonDraftWithCodex.mockResolvedValue(draft);
    mockReviewMoveFunctionsWithCodex
      .mockResolvedValueOnce({
        approved: false,
        reasons: ["Fn Move: contains disallowed pattern"],
        reviewer: "codex",
        model: "gpt-4.1-mini"
      })
      .mockResolvedValueOnce({
        approved: false,
        reasons: ["Fn Move: still unsafe after repair"],
        reviewer: "codex",
        model: "gpt-4.1-mini"
      });

    const request = new NextRequest("http://localhost:3000/api/pokemon/create", {
      method: "POST",
      body: JSON.stringify({ prompt: "Make a fire guardian with a custom shield function." }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "function-review-test-client"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.code).toBe("FUNCTION_SECURITY_REVIEW_FAILED");
    expect(Array.isArray(json.reasons)).toBe(true);
    expect(mockGeneratePokemonDraftWithCodex).toHaveBeenCalledTimes(2);
    expect(mockReviewMoveFunctionsWithCodex).toHaveBeenCalledTimes(2);
    delete process.env.ENABLE_MOVE_FUNCTION_BLOBS;
  });
});
