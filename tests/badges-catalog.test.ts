import { describe, it, expect } from "vitest";
import {
  BADGE_CATALOG,
  RARITY_WEIGHT,
  achievementScore,
  CATEGORY_ORDER,
  type BadgeRarity,
} from "@/config/badges";

describe("badge catalogue integrity", () => {
  it("has unique keys within the DB column limit (VarChar 40)", () => {
    const keys = BADGE_CATALOG.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      expect(k).toMatch(/^[a-z0-9_]+$/);
      expect(k.length).toBeLessThanOrEqual(40);
    }
  });

  it("keeps labels within VarChar(80)", () => {
    for (const b of BADGE_CATALOG) expect(b.label.length).toBeLessThanOrEqual(80);
  });

  it("uses only known rarities and categories", () => {
    const rarities = new Set(Object.keys(RARITY_WEIGHT));
    for (const b of BADGE_CATALOG) {
      expect(rarities.has(b.rarity)).toBe(true);
      expect(CATEGORY_ORDER).toContain(b.category);
    }
  });

  it("auto badges carry criteria; manual badges do not", () => {
    for (const b of BADGE_CATALOG) {
      if (b.awardMode === "auto") {
        expect(b.criteria, `${b.key} should have criteria`).toBeTruthy();
        expect(b.criteria!.target).toBeGreaterThan(0);
        expect(Array.isArray(b.criteria!.triggers)).toBe(true);
      } else {
        expect(b.criteria, `${b.key} manual should have no criteria`).toBeUndefined();
      }
    }
  });

  it("all icon paths point under /achievements/", () => {
    for (const b of BADGE_CATALOG) expect(b.iconUrl.startsWith("/achievements/")).toBe(true);
  });

  it("series badges have strictly increasing targets in order", () => {
    const bySeries = new Map<string, typeof BADGE_CATALOG>();
    for (const b of BADGE_CATALOG) {
      if (!b.seriesKey) continue;
      const arr = bySeries.get(b.seriesKey) ?? [];
      arr.push(b);
      bySeries.set(b.seriesKey, arr);
    }
    for (const [key, arr] of bySeries) {
      const sorted = [...arr].sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
      // seriesOrder must be unique + contiguous from 1
      expect(sorted.map((b) => b.seriesOrder)).toEqual(sorted.map((_, i) => i + 1));
      for (let i = 1; i < sorted.length; i++) {
        expect(
          sorted[i].criteria!.target,
          `${key} target should increase`,
        ).toBeGreaterThan(sorted[i - 1].criteria!.target);
      }
    }
  });

  it("cron-only (no-trigger) auto badges are the time-based ones", () => {
    const cronOnly = BADGE_CATALOG.filter(
      (b) => b.awardMode === "auto" && b.criteria!.triggers.length === 0,
    ).map((b) => b.key);
    // streaks, tenure, the_legend — all present, nothing event-driven slipped in
    for (const k of cronOnly) {
      expect(k).toMatch(/^(streak_|tenure_|the_legend)/);
    }
    expect(cronOnly).toContain("streak_5_day");
    expect(cronOnly).toContain("the_legend");
  });
});

describe("achievementScore", () => {
  it("weights by rarity", () => {
    expect(achievementScore(["common"])).toBe(1);
    expect(achievementScore(["legendary"])).toBe(30);
    expect(achievementScore(["common", "rare", "epic"])).toBe(1 + 7 + 15);
    expect(achievementScore([])).toBe(0);
  });

  it("matches summing weights over the whole catalogue", () => {
    const rarities = BADGE_CATALOG.map((b) => b.rarity as BadgeRarity);
    const expected = rarities.reduce((s, r) => s + RARITY_WEIGHT[r], 0);
    expect(achievementScore(rarities)).toBe(expected);
  });
});
