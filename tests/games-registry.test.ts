import { describe, it, expect } from "vitest";
import { GAMES, LIVE_GAMES, gameByKey, gameBySlug, gameByCode, launchDate, canViewArchive } from "@/config/games";

describe("games registry", () => {
  it("has unique keys, slugs, and codes", () => {
    const keys = GAMES.map((g) => g.key);
    const slugs = GAMES.map((g) => g.slug);
    const codes = GAMES.map((g) => g.code);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("looks up by key, slug, and code", () => {
    expect(gameByKey("alfazy")?.slug).toBe("alfazy");
    expect(gameBySlug("hit-and-blow")?.key).toBe("hit_and_blow");
    expect(gameByCode("intg")?.key).toBe("integra");
  });

  it("returns undefined for unknown lookups", () => {
    expect(gameByKey("nope")).toBeUndefined();
    expect(gameBySlug("nope")).toBeUndefined();
    expect(gameByCode("nope")).toBeUndefined();
  });

  it("LIVE_GAMES contains only live games", () => {
    expect(LIVE_GAMES.every((g) => g.status === "live")).toBe(true);
    expect(LIVE_GAMES.map((g) => g.key)).toContain("alfazy");
  });

  it("launchDate parses launchISO as a UTC date", () => {
    const d = launchDate("alfazy");
    expect(d.getTime()).toBe(Date.UTC(2026, 6, 1));
  });

  it("launchDate throws on unknown key", () => {
    // @ts-expect-error testing runtime guard
    expect(() => launchDate("nope")).toThrow();
  });

  it("canViewArchive: paid tiers unlock the archive, free tiers do not", () => {
    for (const t of ["associate", "premium", "life", "committee"]) expect(canViewArchive(t)).toBe(true);
    for (const t of ["student", "inactive", "free", undefined, ""]) expect(canViewArchive(t)).toBe(false);
  });
});
