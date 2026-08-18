import { describe, it, expect } from "vitest";
import { brokenStreakLength, streakLength } from "@/modules/games/leaderboard";

const today = new Date("2026-08-18T12:00:00Z");
const days = (...isos: string[]) => new Set(isos);

describe("brokenStreakLength (streak_lost detection)", () => {
  it("null when no history", () => {
    expect(brokenStreakLength(days(), today)).toBeNull();
  });
  it("null when played yesterday (streak continuous)", () => {
    expect(brokenStreakLength(days("2026-08-17", "2026-08-16"), today)).toBeNull();
  });
  it("null when already played today", () => {
    expect(brokenStreakLength(days("2026-08-18", "2026-08-17"), today)).toBeNull();
  });
  it("returns the ended streak length after a gap", () => {
    // last played 15th & 14th & 13th, then missed 16th+17th → returning on 18th
    expect(brokenStreakLength(days("2026-08-15", "2026-08-14", "2026-08-13"), today)).toBe(3);
  });
  it("single stale play → streak of 1", () => {
    expect(brokenStreakLength(days("2026-08-10"), today)).toBe(1);
  });
  it("agrees with streakLength for the prior run", () => {
    const set = days("2026-08-15", "2026-08-14");
    expect(brokenStreakLength(set, today)).toBe(streakLength(set, new Date("2026-08-15T00:00:00Z")));
  });
});
