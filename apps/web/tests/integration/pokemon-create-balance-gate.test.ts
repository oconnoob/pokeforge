import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/pokemon/create/route";

const mockGeneratePokemonDraftWithCodex = vi.hoisted(() => vi.fn());
const mockReviewMoveFunctionsWithCodex = vi.hoisted(() => vi.fn());
const mockModerateGenerationPrompt = vi.hoisted(() => vi.fn());
const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());
const mockGeneratePokemonImagePair = vi.hoisted(() => vi.fn());
const mockPersistGeneratedPokemon = vi.hoisted(() => vi.fn());
const mockValidateBalance = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/ai/images", () => ({
  generatePokemonImagePair: mockGeneratePokemonImagePair
}));

vi.mock("@/lib/pokemon/generation-repository", () => ({
  persistGeneratedPokemon: mockPersistGeneratedPokemon
}));

vi.mock("@/lib/pokemon/balance", () => ({
  validateBalance: mockValidateBalance
}));

const validDraft = {
  name: "SoftMon",
  primaryType: "fire",
  secondaryType: undefined,
  stats: { hp: 90, attack: 84, defense: 76, speed: 88 },
  moves: [
    { id: "m1", name: "Heat 1", type: "fire", power: 70, accuracy: 0.9, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
    { id: "m2", name: "Heat 2", type: "normal", power: 60, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
    { id: "m3", name: "Heat 3", type: "rock", power: 65, accuracy: 0.95, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
    { id: "m4", name: "Heat 4", type: "fighting", power: 68, accuracy: 0.92, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null }
  ]
};

describe("POST /api/pokemon/create balance gate", () => {
  beforeEach(() => {
    delete process.env.ENABLE_STRICT_BALANCE_GATE;
    mockModerateGenerationPrompt.mockResolvedValue({ allowed: true });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } })
      }
    });
    mockGeneratePokemonDraftWithCodex.mockResolvedValue(validDraft);
    mockReviewMoveFunctionsWithCodex.mockResolvedValue({
      approved: true,
      reasons: [],
      reviewer: "codex",
      model: "gpt-4.1-mini"
    });
    mockGeneratePokemonImagePair.mockResolvedValue({
      frontPng: Buffer.from([1, 2, 3]),
      backPng: Buffer.from([4, 5, 6])
    });
    mockPersistGeneratedPokemon.mockResolvedValue({
      pokemon: {
        id: "generated-1",
        name: "SoftMon"
      }
    });
    mockValidateBalance.mockReturnValue({
      passed: false,
      reasons: ["SIMULATION_BALANCE_FAILED: win rate 23% is outside 35-65%."],
      report: {}
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.ENABLE_STRICT_BALANCE_GATE;
  });

  it("does not enforce simulation balance when strict balance gate is disabled", async () => {
    const request = new NextRequest("http://localhost:3000/api/pokemon/create", {
      method: "POST",
      body: JSON.stringify({ prompt: "Create a balanced fire guardian pokemon." }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "balance-soft-test-client"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.pokemon.id).toBe("generated-1");
    expect(mockValidateBalance).not.toHaveBeenCalled();
  });
});
