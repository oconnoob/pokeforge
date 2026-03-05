import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/pokemon/generate/route";

describe("POST /api/pokemon/generate", () => {
  it("rejects invalid prompt payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/pokemon/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "short" }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Invalid prompt payload");
  });

  it("blocks unsafe prompt before auth", async () => {
    const request = new NextRequest("http://localhost:3000/api/pokemon/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "Please create a pokemon themed around terrorism imagery" }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error).toContain("content policy");
  });
});
