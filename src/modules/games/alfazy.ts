/**
 * Alfazy core — Wordle rules + scoring. Pure functions are DB-free (tested
 * directly); getDailyWord() is the thin DB wrapper over the AlfazyWord dictionary.
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { launchDate } from "@/config/games";
import { puzzleNumber } from "./periods";

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;

export type Tile = "correct" | "present" | "absent";

/** Which dictionary index a puzzle number maps to, given the active-word count. */
export function pickIndex(puzzleNo: number, wordCount: number): number {
  if (wordCount <= 0) throw new Error("no words in dictionary");
  // puzzleNo is 1-based; day 0 (#1) → idx 0.
  return (puzzleNo - 1) % wordCount;
}

/**
 * Wordle feedback for one guess vs answer. Handles duplicate letters correctly:
 * greens consume a slot first, then each 'present' consumes a remaining
 * occurrence — extra copies read 'absent'.
 */
export function checkGuess(guess: string, answer: string): Tile[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  if (g.length !== a.length) throw new Error("length mismatch");

  const result: Tile[] = new Array(g.length).fill("absent");
  const remaining: Record<string, number> = {};

  // Pass 1: greens.
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) result[i] = "correct";
    else remaining[a[i]] = (remaining[a[i]] ?? 0) + 1;
  }
  // Pass 2: yellows against remaining counts.
  for (let i = 0; i < g.length; i++) {
    if (result[i] === "correct") continue;
    if ((remaining[g[i]] ?? 0) > 0) {
      result[i] = "present";
      remaining[g[i]]!--;
    }
  }
  return result;
}

export function isSolved(tiles: Tile[]): boolean {
  return tiles.every((t) => t === "correct");
}

export interface PlayResult {
  solved: boolean;
  guessesUsed: number; // 1..MAX_GUESSES
  score: number;
}

/**
 * Score a completed play. Guesses only, no timer:
 *   solved → 100 + (MAX_GUESSES - guessesUsed) * 20   (1 guess→200 … 6→100)
 *   failed → 20 (participation)
 */
export function scorePlay(solved: boolean, guessesUsed: number): number {
  if (!solved) return 20;
  const g = Math.max(1, Math.min(MAX_GUESSES, guessesUsed));
  return 100 + (MAX_GUESSES - g) * 20;
}

/**
 * Validate a full list of guesses server-side against the answer, returning the
 * authoritative result. Stops at first solve. Never trusts a client score.
 */
export function gradeGame(guesses: string[], answer: string): PlayResult {
  const trimmed = guesses.slice(0, MAX_GUESSES);
  let solved = false;
  let used = trimmed.length;
  for (let i = 0; i < trimmed.length; i++) {
    if (isSolved(checkGuess(trimmed[i], answer))) {
      solved = true;
      used = i + 1;
      break;
    }
  }
  return { solved, guessesUsed: used, score: scorePlay(solved, used) };
}

export interface DailyPuzzle {
  puzzleNo: number;
  word: string;
}

/** The answer word for a given 1-based puzzle number, read from the DB dictionary. */
export async function wordForPuzzleNo(puzzleNo: number): Promise<string> {
  const count = await prisma.alfazyWord.count({ where: { isActive: true } });
  const idx = pickIndex(puzzleNo, count);
  const row = await prisma.alfazyWord.findFirst({ where: { isActive: true, idx } });
  if (!row) throw new Error(`no active word at idx ${idx}`);
  return row.word.toUpperCase();
}

/** Today's (or a given date's) puzzle: word read from the DB dictionary. */
async function fetchDailyPuzzle(date: Date): Promise<DailyPuzzle> {
  const puzzleNo = puzzleNumber(date, launchDate("alfazy"));
  return { puzzleNo, word: await wordForPuzzleNo(puzzleNo) };
}

// Cached for the whole day — puzzle number is the cache key, so the DB is hit
// once per day instead of once per guess.
const getDailyPuzzleCached = unstable_cache(
  (puzzleNo: number) => fetchDailyPuzzle(new Date()),
  ["alfazy-daily-puzzle"],
  { revalidate: 3600 },
);

export async function getDailyPuzzle(date: Date = new Date()): Promise<DailyPuzzle> {
  const pn = puzzleNumber(date, launchDate("alfazy"));
  return getDailyPuzzleCached(pn);
}
