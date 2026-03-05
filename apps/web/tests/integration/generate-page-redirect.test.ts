import { beforeEach, describe, expect, it, vi } from "vitest";
import { CREATE_PAGE_PATH } from "@/lib/routes";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: redirectMock
}));

import GeneratePageRedirect from "@/app/generate/page";

describe("GET /generate page", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("redirects to /create", async () => {
    await GeneratePageRedirect();
    expect(redirectMock).toHaveBeenCalledWith(CREATE_PAGE_PATH);
  });
});
