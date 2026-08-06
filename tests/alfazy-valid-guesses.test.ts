import { describe, it, expect } from "vitest";
import { VALID_GUESSES, isValidGuess } from "@/lib/games/valid-guesses";
import { ALFAZY_WORDS } from "@/config/alfazy-words";

describe("valid-guess dictionary", () => {
  it("has 14,855 words", () => {
    expect(VALID_GUESSES.size).toBe(14855);
  });
  it("accepts real words, case-insensitive", () => {
    expect(isValidGuess("CRANE")).toBe(true);
    expect(isValidGuess("house")).toBe(true);
  });
  it("rejects non-words", () => {
    expect(isValidGuess("zzzzz")).toBe(false);
    expect(isValidGuess("qwxyz")).toBe(false);
  });
  it("every Alfazy answer is a valid guess (else it can't be submitted to win)", () => {
    const missing = ALFAZY_WORDS.filter((w) => !isValidGuess(w));
    expect(missing).toEqual([]);
  });
});
