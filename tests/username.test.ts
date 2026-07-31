import { describe, it, expect } from "vitest";
import { generateUsername } from "@/app/api/auth/signup/route";

describe("generateUsername", () => {
  it("slugifies a normal name", () => {
    expect(generateUsername("Asha Rao")).toBe("asha-rao");
  });

  it("strips punctuation and collapses whitespace/dashes", () => {
    expect(generateUsername("  Dr. Asha   Rao!! ")).toBe("dr-asha-rao");
    expect(generateUsername("Rao---Asha")).toBe("rao-asha");
  });

  it("caps at 40 chars", () => {
    const long = "a".repeat(80);
    expect(generateUsername(long).length).toBeLessThanOrEqual(40);
  });

  it("falls back to a user-* slug when the name yields nothing", () => {
    const u = generateUsername("!!!@@@");
    expect(u).toMatch(/^user-/);
  });

  it("never leaves leading/trailing dashes", () => {
    const u = generateUsername("-Asha-");
    expect(u.startsWith("-")).toBe(false);
    expect(u.endsWith("-")).toBe(false);
  });
});
