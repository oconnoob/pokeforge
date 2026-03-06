import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetCodexClientFactoryForTests,
  __setCodexClientFactoryForTests,
  generatePokemonDraftWithCodex
} from "@/lib/ai/codex";

describe("generatePokemonDraftWithCodex", () => {
  afterEach(() => {
    __resetCodexClientFactoryForTests();
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });

  it("normalizes out-of-range numeric move fields instead of failing schema", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const modelPayload = {
      name: "Firedoo",
      primaryType: "fire",
      secondaryType: null,
      stats: {
        hp: 120,
        attack: 95,
        defense: 80,
        speed: 85
      },
      moves: [
        {
          name: "Low Spark",
          type: "fire",
          power: 0,
          accuracy: 1.3,
          maxPp: 99,
          behaviorVersion: "v1",
          behaviorProgram: null
        },
        {
          name: "Odd Guard",
          type: "psychic",
          power: 65,
          accuracy: "0.82",
          maxPp: 18,
          behaviorVersion: "v2",
          behaviorProgram: {
            version: "2",
            steps: ["not-a-step-object"]
          }
        },
        {
          name: "Rock Crash",
          type: "rock",
          power: 84,
          accuracy: 0.95,
          maxPp: 20,
          behaviorVersion: "v2",
          behaviorProgram: {
            version: "2",
            steps: [
              { type: "apply_type_guard", types: ["fire"], reductionRatio: 0.5, turns: 2 },
              { type: "apply_dodge_window", evadeChance: 0.3, hits: 1, turns: 2 }
            ]
          }
        },
        {
          name: "Focus Rush",
          type: "fighting",
          power: 78,
          accuracy: 0.9,
          maxPp: 20,
          priority: 4,
          behaviorVersion: "v1",
          behaviorProgram: null
        }
      ]
    };

    __setCodexClientFactoryForTests(() => ({
      startThread: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({
          finalResponse: JSON.stringify(modelPayload)
        })
      })
    }));

    const draft = await generatePokemonDraftWithCodex({
      prompt: "Create a fire guardian with one defensive trick."
    });

    expect(draft.secondaryType).toBeUndefined();
    expect(draft.moves[0]?.power).toBe(20);
    expect(draft.moves[0]?.accuracy).toBe(1);
    expect(draft.moves[0]?.maxPp).toBe(40);
    expect(draft.moves[1]?.behaviorVersion).toBe("v2");
    expect(draft.moves[1]?.behaviorProgram).toEqual({
      version: "2",
      steps: [{ type: "base_attack" }]
    });
    expect(draft.moves[2]?.behaviorVersion).toBe("v2");
    expect(draft.moves[2]?.behaviorProgram).toEqual({
      version: "2",
      steps: [
        { type: "apply_type_guard", types: ["fire"], reductionRatio: 0.5, turns: 2 },
        { type: "apply_dodge_window", evadeChance: 0.3, hits: 1, turns: 2 }
      ]
    });
    expect(draft.moves[3]?.priority).toBe(2);
  });

  it("falls back to responses API when codex sdk runtime fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const modelPayload = {
      name: "FallbackMon",
      primaryType: "water",
      secondaryType: null,
      stats: { hp: 92, attack: 80, defense: 84, speed: 76 },
      moves: [
        { name: "A", type: "water", power: 60, accuracy: 0.9, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { name: "B", type: "normal", power: 55, accuracy: 1, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { name: "C", type: "rock", power: 65, accuracy: 0.95, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null },
        { name: "D", type: "ice", power: 70, accuracy: 0.9, maxPp: 20, behaviorVersion: "v1", behaviorProgram: null }
      ]
    };

    __setCodexClientFactoryForTests(() => ({
      startThread: vi.fn().mockImplementation(() => {
        throw new Error("spawn codex ENOENT");
      })
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output_text: JSON.stringify(modelPayload) })
      })
    );

    const draft = await generatePokemonDraftWithCodex({
      prompt: "Create a sturdy water pokemon."
    });

    expect(draft.name).toBe("FallbackMon");
    expect(draft.moves).toHaveLength(4);
  });
});
