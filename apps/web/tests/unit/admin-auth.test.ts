import { describe, expect, it } from "vitest";
import { isAdminUser, parseAdminEmails } from "@/lib/auth/admin";

describe("parseAdminEmails", () => {
  it("normalizes and splits list", () => {
    const parsed = parseAdminEmails(" Admin@Example.com,foo@bar.com ");
    expect(parsed).toEqual(["admin@example.com", "foo@bar.com"]);
  });
});

describe("isAdminUser", () => {
  it("grants admin when email allowlisted", () => {
    const result = isAdminUser({ email: "admin@example.com" }, ["admin@example.com"]);
    expect(result).toBe(true);
  });

  it("grants admin when app_metadata role is admin", () => {
    const result = isAdminUser({ email: "nope@example.com", app_metadata: { role: "admin" } }, []);
    expect(result).toBe(true);
  });

  it("denies non-admin user", () => {
    const result = isAdminUser({ email: "user@example.com", app_metadata: { role: "user" } }, ["admin@example.com"]);
    expect(result).toBe(false);
  });
});
