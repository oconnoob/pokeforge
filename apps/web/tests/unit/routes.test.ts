import { describe, expect, it } from "vitest";
import { CREATE_API_PATH, CREATE_PAGE_PATH, LEGACY_GENERATE_PAGE_PATH } from "@/lib/routes";

describe("route constants", () => {
  it("uses /create as canonical create page path", () => {
    expect(CREATE_PAGE_PATH).toBe("/create");
  });

  it("keeps /generate as legacy create page alias", () => {
    expect(LEGACY_GENERATE_PAGE_PATH).toBe("/generate");
  });

  it("uses /api/pokemon/create as canonical create endpoint", () => {
    expect(CREATE_API_PATH).toBe("/api/pokemon/create");
  });
});
