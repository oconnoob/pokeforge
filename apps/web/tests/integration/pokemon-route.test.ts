import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/pokemon/route";

describe("GET /api/pokemon", () => {
  it("returns paginated pokemon list", async () => {
    const request = new NextRequest("http://localhost:3000/api/pokemon?page=1&pageSize=5");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.pokemon).toHaveLength(5);
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.pageSize).toBe(5);
    expect(json.pagination.total).toBeGreaterThanOrEqual(24);
  });

  it("supports search filtering", async () => {
    const request = new NextRequest("http://localhost:3000/api/pokemon?search=char");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.pokemon.some((pokemon: { name: string }) => pokemon.name === "Charizard")).toBe(true);
  });

  it("supports source type filtering", async () => {
    const request = new NextRequest("http://localhost:3000/api/pokemon?sourceType=builtin");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.pokemon.every((pokemon: { sourceType: string }) => pokemon.sourceType === "builtin")).toBe(true);
  });

  it("returns battle-ready move sets for listed pokemon", async () => {
    const request = new NextRequest("http://localhost:3000/api/pokemon?page=1&pageSize=10");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.pokemon.every((pokemon: { moves: unknown[] }) => pokemon.moves.length > 0)).toBe(true);
  });
});
