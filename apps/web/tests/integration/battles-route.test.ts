import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/battles/route";

describe("POST /api/battles", () => {
  it("rejects invalid payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/battles", {
      method: "POST",
      body: JSON.stringify({ playerPokemonId: "" }),
      headers: { "content-type": "application/json" }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Invalid battle payload");
  });

  it("rejects same pokemon on both sides", async () => {
    const request = new NextRequest("http://localhost:3000/api/battles", {
      method: "POST",
      body: JSON.stringify({ playerPokemonId: "abc", opponentPokemonId: "abc" }),
      headers: { "content-type": "application/json" }
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("starts battle with valid payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/battles", {
      method: "POST",
      body: JSON.stringify({ playerPokemonId: "abc", opponentPokemonId: "def" }),
      headers: { "content-type": "application/json" }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.status).toBe("initialized");
    expect(json.battleId).toBeTruthy();
  });
});
