/**
 * Hit and Blow — crack the 4-digit code in 9 guesses. Codes have four distinct
 * digits, first non-zero. Feedback is COUNTS (hits = right digit right spot,
 * blows = right digit wrong spot) — non-positional, so the board shows a
 * hits/blows tally per guess, not coloured cells.
 *
 * Formula-driven: all 4536 valid codes are shuffled once with a fixed seed, so
 * the daily secret is deterministic and identical for every player. No DB table.
 */

import { seededShuffle } from "@/lib/games/rng";
import { type GameEngine, type GuessResult } from "./types";

export const CODE_LEN = 4;
export const HB_MAX_GUESSES = 9;
const SEED = 0x7e42d05b;

/** Every 4-digit code with distinct digits and a non-zero first digit (4536 of them). */
function allCodes(): string[] {
  const out: string[] = [];
  for (let a = 1; a <= 9; a++)
    for (let b = 0; b <= 9; b++) {
      if (b === a) continue;
      for (let c = 0; c <= 9; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d <= 9; d++) {
          if (d === a || d === b || d === c) continue;
          out.push(`${a}${b}${c}${d}`);
        }
      }
    }
  return out;
}

const CODES = seededShuffle(allCodes(), SEED);

/** The secret code for a 1-based puzzle number. */
export function secretFor(puzzleNo: number): string {
  const i = ((puzzleNo - 1) % CODES.length + CODES.length) % CODES.length;
  return CODES[i];
}

/** hits = right digit right spot; blows = right digit wrong spot. Digits are unique. */
export function scoreGuess(guess: string, secret: string): { hits: number; blows: number } {
  let hits = 0;
  let common = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) hits++;
    if (secret.includes(guess[i])) common++;
  }
  return { hits, blows: common - hits };
}

export function isValidHitAndBlow(guess: string): boolean {
  if (!/^[0-9]{4}$/.test(guess)) return false;
  if (guess[0] === "0") return false;
  return new Set(guess).size === CODE_LEN; // distinct digits
}

/** solved → 100 + (9 - guesses)*10 (1 guess = 180 … 9 = 100); failed → 20. */
export function scoreHitAndBlow(solved: boolean, guessesUsed: number): number {
  if (!solved) return 20;
  const g = Math.max(1, Math.min(HB_MAX_GUESSES, guessesUsed));
  return 100 + (HB_MAX_GUESSES - g) * 10;
}

export const hitAndBlowEngine: GameEngine = {
  key: "hit_and_blow",
  length: CODE_LEN,
  maxGuesses: HB_MAX_GUESSES,
  render: "count",
  keyboard: [
    ["1", "2", "3", "4", "5"].map((k) => ({ key: k })),
    ["6", "7", "8", "9", "0"].map((k) => ({ key: k })),
    [
      { key: "ENTER", wide: true },
      { key: "DEL", wide: true },
    ],
  ],
  getAnswer: (puzzleNo) => Promise.resolve(secretFor(puzzleNo)),
  isValidGuess: isValidHitAndBlow,
  evaluate: (guess, answer): GuessResult => {
    const { hits, blows } = scoreGuess(guess, answer);
    return { kind: "count", hits, blows, solved: hits === CODE_LEN };
  },
  scorePlay: scoreHitAndBlow,
};
