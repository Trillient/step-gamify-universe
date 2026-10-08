import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameEmail, usernameError } from "../src/lib/manualAuth";

describe("manual account identifiers", () => {
  it("normalizes usernames and maps them to an internal Firebase identifier", () => {
    expect(normalizeUsername("  Wooly_Walker ")).toBe("wooly_walker");
    expect(usernameEmail("Wooly_Walker")).toBe("wooly_walker@steps.woolston.dev");
  });

  it("accepts bounded usernames and rejects ambiguous identifiers", () => {
    expect(usernameError("wooly-walker")).toBeNull();
    expect(usernameError("ab")).toBeTruthy();
    expect(usernameError("wooly walker")).toBeTruthy();
    expect(usernameError("-wooly")).toBeTruthy();
    expect(usernameError("wooly-".repeat(8))).toBeTruthy();
  });
});
