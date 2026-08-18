/**
 * The one contract every game implements. Boards and server actions are written
 * against this interface — never a concrete game — so adding a game is an engine +
 * a registry entry, with zero changes to the shared route/leaderboard/action code.
 *
 * Two feedback shapes are supported, discriminated by `render`:
 *  - "tiles": positional exact-match games (Alfazy, Integra) — per-cell colours.
 *  - "count": non-positional games (Hit-and-Blow) — hits/blows counts per guess.
 */

import type { GameKey } from "@/config/games";

/** Per-cell feedback for positional (tiles) games. */
export type Tile = "correct" | "present" | "absent";

/** One graded guess. `solved` is the engine's authoritative win check for that guess. */
export type GuessResult =
  | { kind: "tiles"; tiles: Tile[]; solved: boolean }
  | { kind: "count"; hits: number; blows: number; solved: boolean };

/** One on-screen keyboard key. `wide` keys (Enter/Del) render at double width. */
export interface KeyDef {
  key: string; // value sent to the board handler, e.g. "A", "7", "ENTER", "DEL"
  label?: string;
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
  /** How the board renders feedback. */
  render: "tiles" | "count";
  /** Authoritative answer for a 1-based puzzle number. Server-only — never sent to the client. */
  getAnswer(puzzleNo: number): Promise<string>;
  /** Is this a legal move? (in dictionary / well-formed). */
  isValidGuess(guess: string): boolean;
  /** Grade one guess vs the answer. */
  evaluate(guess: string, answer: string): GuessResult;
  /** Score a completed play → int for the SUM leaderboard. */
  scorePlay(solved: boolean, guessesUsed: number): number;
}

/** Standard emoji grid for tiles games (🟩🟨⬜). */
export function emojiGrid(rows: Tile[][]): string {
  const cell: Record<Tile, string> = { correct: "🟩", present: "🟨", absent: "⬜" };
  return rows.map((r) => r.map((t) => cell[t]).join("")).join("\n");
}

/** Shareable text for a completed play — emoji rows for tiles, 🎯/💨 lines for counts. */
export function shareResults(results: GuessResult[]): string {
  return results
    .map((r) => (r.kind === "tiles" ? r.tiles.map((t) => ({ correct: "🟩", present: "🟨", absent: "⬜" })[t]).join("") : `🎯${r.hits} 💨${r.blows}`))
    .join("\n");
}

export interface PlayResult {
  solved: boolean;
  guessesUsed: number;
  score: number;
  results: GuessResult[];
}

/**
 * Authoritatively grade a full list of guesses. Stops at the first solve. Never
 * trusts a client score — this is the server-side truth.
 */
export function runGame(engine: GameEngine, guesses: string[], answer: string): PlayResult {
  const trimmed = guesses.slice(0, engine.maxGuesses);
  const results: GuessResult[] = [];
  let solved = false;
  let used = trimmed.length;
  for (let i = 0; i < trimmed.length; i++) {
    const r = engine.evaluate(trimmed[i], answer);
    results.push(r);
    if (r.solved) {
      solved = true;
      used = i + 1;
      break;
    }
  }
  return { solved, guessesUsed: used, score: engine.scorePlay(solved, used), results };
}
