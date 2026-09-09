import { describe, it, expect } from "vitest";
import { meetsCriteria, currentStreak } from "@/modules/badges/evaluate";
import type { BadgeCriteria } from "@/config/badges";

const c = (over: Partial<BadgeCriteria> = {}): BadgeCriteria => ({
  metric: "posts_created",
  op: ">=",
  target: 10,
  window: "all_time",
  triggers: ["post_create"],
  ...over,
});

describe("meetsCriteria", () => {
  it(">= unlocks at and above target", () => {
    expect(meetsCriteria(c(), 9, 999)).toMatchObject({ unlocked: false, progress: 9 });
    expect(meetsCriteria(c(), 10, 999)).toMatchObject({ unlocked: true, progress: 10 });
    expect(meetsCriteria(c(), 11, 999)).toMatchObject({ unlocked: true, progress: 10 }); // capped
  });

  it("> is strict", () => {
    expect(meetsCriteria(c({ op: ">" }), 10, 999).unlocked).toBe(false);
    expect(meetsCriteria(c({ op: ">" }), 11, 999).unlocked).toBe(true);
  });

  it("== matches exactly", () => {
    expect(meetsCriteria(c({ op: "==", target: 0 }), 0, 999).unlocked).toBe(true);
    expect(meetsCriteria(c({ op: "==", target: 0 }), 1, 999).unlocked).toBe(false);
  });

  it("clamps progress to [0, target]", () => {
    expect(meetsCriteria(c(), -5, 999).progress).toBe(0);
    expect(meetsCriteria(c(), 3, 999).progress).toBe(3);
    expect(meetsCriteria(c(), 50, 999).progress).toBe(10);
  });

  it("account-age gate blocks unlock but keeps progress", () => {
    const gated = c({ minAccountAgeDays: 7, target: 1 });
    expect(meetsCriteria(gated, 5, 3)).toMatchObject({ unlocked: false, progress: 1 });
    expect(meetsCriteria(gated, 5, 7)).toMatchObject({ unlocked: true, progress: 1 });
  });

  it("target of 1 (one-shot) unlocks on first occurrence", () => {
    expect(meetsCriteria(c({ target: 1 }), 0, 999).unlocked).toBe(false);
    expect(meetsCriteria(c({ target: 1 }), 1, 999).unlocked).toBe(true);
  });
});

describe("currentStreak", () => {
  const T = 20000; // arbitrary "today" day-number

  it("counts a run ending today", () => {
    expect(currentStreak([T, T - 1, T - 2], T)).toBe(3);
  });

  it("counts a run ending yesterday (today not yet active)", () => {
    expect(currentStreak([T - 1, T - 2], T)).toBe(2);
  });

  it("is 0 when the last active day is older than yesterday (streak broken)", () => {
    expect(currentStreak([T - 2, T - 3], T)).toBe(0);
  });

  it("stops at the first gap", () => {
    expect(currentStreak([T, T - 1, T - 3, T - 4], T)).toBe(2);
  });

  it("ignores duplicates and unordered input", () => {
    expect(currentStreak([T - 2, T, T - 1, T, T - 2], T)).toBe(3);
  });

  it("empty → 0", () => {
    expect(currentStreak([], T)).toBe(0);
  });
});
