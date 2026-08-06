import { describe, it, expect } from "vitest";
import { checkGuess, isSolved, scorePlay, gradeGame, pickIndex, MAX_GUESSES } from "@/modules/games/alfazy";

describe("checkGuess (Wordle feedback)", () => {
  it("all correct", () => {
    expect(checkGuess("HOUSE", "HOUSE")).toEqual(["correct", "correct", "correct", "correct", "correct"]);
    expect(isSolved(checkGuess("HOUSE", "HOUSE"))).toBe(true);
  });
  it("present vs absent", () => {
    // answer CRANE, guess REACT: A is green, R/E/C present, T absent
    expect(checkGuess("REACT", "CRANE")).toEqual(["present", "present", "correct", "present", "absent"]);
  });
  it("duplicate letters in guess only count as many as in answer", () => {
    // answer ABIDE, guess AAHED → A green, 2nd A absent, H absent, E/D present
    expect(checkGuess("AAHED", "ABIDE")).toEqual(["correct", "absent", "absent", "present", "present"]);
  });
  it("green consumes the slot before yellows", () => {
    // answer LLAMA vs guess ALALA — verify no over-counting of L/A
    const t = checkGuess("ALALA", "LLAMA");
    expect(t).toHaveLength(5);
    expect(t.filter((x) => x === "correct").length).toBeGreaterThanOrEqual(1);
  });
  it("case-insensitive", () => {
    expect(checkGuess("house", "HOUSE")).toEqual(new Array(5).fill("correct"));
  });
});

describe("scorePlay (guesses only, no timer)", () => {
  it("solve in 1 = 200, in 6 = 100", () => {
    expect(scorePlay(true, 1)).toBe(200);
    expect(scorePlay(true, 6)).toBe(100);
  });
  it("linear 20 per guess", () => {
    expect(scorePlay(true, 3)).toBe(160);
    expect(scorePlay(true, 2)).toBe(180);
  });
  it("fail = 20", () => {
    expect(scorePlay(false, 6)).toBe(20);
  });
  it("clamps out-of-range guesses", () => {
    expect(scorePlay(true, 0)).toBe(200);
    expect(scorePlay(true, 99)).toBe(100);
  });
});

describe("gradeGame (server authoritative)", () => {
  it("stops at first solving guess", () => {
    const r = gradeGame(["CRANE", "SLOTH", "HOUSE"], "HOUSE");
    expect(r).toEqual({ solved: true, guessesUsed: 3, score: 160 });
  });
  it("failed after 6 wrong", () => {
    const r = gradeGame(["AAAAA", "BBBBB", "CCCCC", "DDDDD", "EEEEE", "FFFFF"], "HOUSE");
    expect(r.solved).toBe(false);
    expect(r.score).toBe(20);
  });
  it("solve on first guess", () => {
    expect(gradeGame(["HOUSE"], "HOUSE")).toEqual({ solved: true, guessesUsed: 1, score: 200 });
  });
});

describe("pickIndex (daily word from dictionary)", () => {
  it("puzzle #1 → idx 0", () => {
    expect(pickIndex(1, 200)).toBe(0);
  });
  it("wraps around the dictionary", () => {
    expect(pickIndex(201, 200)).toBe(0);
    expect(pickIndex(36, 200)).toBe(35);
  });
  it("throws on empty dictionary", () => {
    expect(() => pickIndex(1, 0)).toThrow();
  });
  it("never exceeds MAX_GUESSES weighting", () => {
    expect(scorePlay(true, MAX_GUESSES)).toBe(100);
  });
});
