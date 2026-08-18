/**
 * The one contract every game implements. Boards and server actions are written
 * against this interface — never a concrete game — so adding a game is an engine +
 * a registry entry, with zero changes to the shared board/route/leaderboard code.
 */

import type { GameKey } from "@/config/games";

/** Per-cell feedback. Grid games map their scoring onto these three states. */
export type Tile = "correct" | "present" | "absent";

/** One on-screen keyboard key. `wide` keys (Enter/Del) render at double width. */
export interface KeyDef {
  key: string; // value sent to the board handler, e.g. "A", "7", "ENTER", "DEL"
  label?: string; // display override; defaults to `key`
  wide?: boolean;
}
export type KeyRow = KeyDef[];

export interface GameEngine {
  key: GameKey;
  /** Cells per guess row. */
  length: number;
  /** Number of guess rows. */
  maxGuesses: number;
  /** On-screen keyboard layout. */
  keyboard: KeyRow[];
  /** Authoritative answer for a 1-based puzzle number. Server-only — never sent to the client. */
  getAnswer(puzzleNo: number): Promise<string>;
  /** Is this a legal move? (in dictionary / well-formed). */
  isValidGuess(guess: string): boolean;
  /** Per-cell feedback for one guess vs the answer. */
  grade(guess: string, answer: string): Tile[];
  /** Score a completed play → int for the SUM leaderboard. */
  scorePlay(solved: boolean, guessesUsed: number): number;
  /** Emoji grid for sharing (one line per graded row). */
  shareGrid(rows: Tile[][]): string;
}

/** Standard emoji grid shared by grid games (🟩🟨⬜). */
export function emojiGrid(rows: Tile[][]): string {
  const cell: Record<Tile, string> = { correct: "🟩", present: "🟨", absent: "⬜" };
  return rows.map((r) => r.map((t) => cell[t]).join("")).join("\n");
}

export interface PlayResult {
  solved: boolean;
  guessesUsed: number;
  score: number;
  grid: Tile[][];
}

/**
 * Authoritatively grade a full list of guesses against the answer. Stops at the
 * first solve. Never trusts a client score — this is the server-side truth.
 */
export function runGame(engine: GameEngine, guesses: string[], answer: string): PlayResult {
  const trimmed = guesses.slice(0, engine.maxGuesses);
  const grid: Tile[][] = [];
  let solved = false;
  let used = trimmed.length;
  for (let i = 0; i < trimmed.length; i++) {
    const tiles = engine.grade(trimmed[i], answer);
    grid.push(tiles);
    if (tiles.every((t) => t === "correct")) {
      solved = true;
      used = i + 1;
      break;
    }
  }
  return { solved, guessesUsed: used, score: engine.scorePlay(solved, used), grid };
}
