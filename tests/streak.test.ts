import { describe, it, expect } from "vitest";
import { streakLength } from "@/modules/games/leaderboard";

// Fixed "now": 2026-08-06 (a Thursday), compared in UTC.
const now = new Date("2026-08-06T09:00:00Z");
const day = (s: string) => s; // yyyy-mm-dd keys, as stored

describe("streakLength", () => {
  it("is 0 with no plays", () => {
    expect(streakLength(new Set(), now)).toBe(0);
  });

  it("counts today + consecutive prior days", () => {
    const days = new Set([day("2026-08-06"), day("2026-08-05"), day("2026-08-04")]);
    expect(streakLength(days, now)).toBe(3);
  });

  it("stays alive from yesterday when today is not yet played", () => {
    const days = new Set([day("2026-08-05"), day("2026-08-04")]);
    expect(streakLength(days, now)).toBe(2);
  });

  it("is 0 when the most recent play is 2+ days ago", () => {
    const days = new Set([day("2026-08-04"), day("2026-08-03")]);
    expect(streakLength(days, now)).toBe(0);
  });

  it("stops at the first gap", () => {
    const days = new Set([day("2026-08-06"), day("2026-08-05"), day("2026-08-03")]);
    expect(streakLength(days, now)).toBe(2);
  });
});
