/** Per-game board colour themes (presentational, serializable → passed to GameBoard). */

import type { GameKey } from "./games";

export interface BoardTheme {
  correct: string;
  present: string;
  absent: string;
  filled: string;
  empty: string;
  keyCorrect: string;
  keyPresent: string;
  keyAbsent: string;
  keyIdle: string;
}

const ALFAZY_THEME: BoardTheme = {
  correct: "bg-emerald-500 border-emerald-500 text-white",
  present: "bg-amber-400 border-amber-400 text-white",
  absent: "bg-gray-400 border-gray-400 text-white",
  filled: "border-gray-400 text-gray-900",
  empty: "border-gray-200 text-gray-900",
  keyCorrect: "bg-emerald-500 text-white",
  keyPresent: "bg-amber-400 text-white",
  keyAbsent: "bg-gray-300 text-gray-500",
  keyIdle: "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95",
};

const GAME_THEMES: Partial<Record<GameKey, BoardTheme>> = {
  alfazy: ALFAZY_THEME,
};

/** A game's board theme, defaulting to the Alfazy palette until a game defines its own. */
export function getBoardTheme(key: GameKey): BoardTheme {
  return GAME_THEMES[key] ?? ALFAZY_THEME;
}
