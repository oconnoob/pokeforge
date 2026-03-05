import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/sprites/[pokemonId]/[view]/route";

describe("GET /api/sprites/:pokemonId/:view", () => {
  it("requires authentication", async () => {
    const request = new NextRequest("http://localhost:3000/api/sprites/generated-123/front");
    const response = await GET(request, { params: Promise.resolve({ pokemonId: "generated-123", view: "front" }) });

    expect(response.status).toBe(401);
  });

  it("rejects invalid view", async () => {
    const request = new NextRequest("http://localhost:3000/api/sprites/generated-123/side");
    const response = await GET(request, { params: Promise.resolve({ pokemonId: "generated-123", view: "side" }) });

    expect(response.status).toBe(400);
  });
});
