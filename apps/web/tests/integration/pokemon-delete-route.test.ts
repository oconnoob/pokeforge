import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/pokemon/[pokemonId]/route";

describe("DELETE /api/pokemon/:pokemonId", () => {
  it("requires authentication", async () => {
    const request = new NextRequest("http://localhost:3000/api/pokemon/generated-123", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ pokemonId: "generated-123" }) });

    expect(response.status).toBe(401);
  });
});
