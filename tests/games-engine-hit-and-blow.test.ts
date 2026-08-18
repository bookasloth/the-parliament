import { describe, it, expect } from "vitest";
import { getEngine } from "@/modules/games/engines";
import {
  scoreGuess,
  isValidHitAndBlow,
  secretFor,
  scoreHitAndBlow,
} from "@/modules/games/engines/hit-and-blow";

const hb = getEngine("hit_and_blow");

describe("hit-and-blow engine", () => {
  it("is a 4×9 count game", () => {
    expect(hb.length).toBe(4);
    expect(hb.maxGuesses).toBe(9);
    expect(hb.render).toBe("count");
  });

  it("scores hits and blows (unique digits)", () => {
    expect(scoreGuess("1234", "1234")).toEqual({ hits: 4, blows: 0 });
    expect(scoreGuess("1234", "1243")).toEqual({ hits: 2, blows: 2 }); // 1,2 hit; 3,4 swapped
    expect(scoreGuess("5678", "1234")).toEqual({ hits: 0, blows: 0 });
    expect(scoreGuess("1265", "1234")).toEqual({ hits: 2, blows: 0 }); // 1,2 hit; 6,5 absent
  });

  it("evaluate reports solved only on 4 hits", () => {
    const win = hb.evaluate("1234", "1234");
    expect(win).toEqual({ kind: "count", hits: 4, blows: 0, solved: true });
    const miss = hb.evaluate("1243", "1234");
    expect(miss.solved).toBe(false);
  });

  it("validates: 4 distinct digits, non-zero first", () => {
    expect(isValidHitAndBlow("1234")).toBe(true);
    expect(isValidHitAndBlow("0123")).toBe(false); // leading zero
    expect(isValidHitAndBlow("1123")).toBe(false); // repeat
    expect(isValidHitAndBlow("123")).toBe(false); // too short
    expect(isValidHitAndBlow("12a4")).toBe(false); // non-digit
  });

  it("secretFor is valid, deterministic, and wraps over the 4536-code set", () => {
    const s = secretFor(1);
    expect(isValidHitAndBlow(s)).toBe(true);
    expect(secretFor(1)).toBe(secretFor(1)); // deterministic
    expect(secretFor(4537)).toBe(secretFor(1)); // wraps mod 4536
    expect(secretFor(2)).not.toBe(secretFor(1)); // shuffled sequence advances
  });

  it("scores: 1 guess = 180, 9 = 100, fail = 20", () => {
    expect(scoreHitAndBlow(true, 1)).toBe(180);
    expect(scoreHitAndBlow(true, 9)).toBe(100);
    expect(scoreHitAndBlow(false, 9)).toBe(20);
  });
});
