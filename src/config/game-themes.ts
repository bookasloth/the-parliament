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
  present: "bg-[#d4a017] border-[#d4a017] text-white", // mustard/gold, not bright yellow
  absent: "bg-gray-400 border-gray-400 text-white",
  filled: "border-gray-400 text-gray-900",
  empty: "border-gray-200 text-gray-900",
  keyCorrect: "bg-emerald-500 text-white",
  keyPresent: "bg-[#d4a017] text-white",
  keyAbsent: "bg-gray-300 text-gray-500",
  keyIdle: "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95",
};

// Hit-and-Blow renders digit cells (neutral) + a hits/blows tally; the "tiles"
// colours are unused for count games but kept complete for the shared board.
const HIT_AND_BLOW_THEME: BoardTheme = {
  correct: "bg-sky-500 border-sky-500 text-white",
  present: "bg-sky-300 border-sky-300 text-white",
  absent: "bg-gray-400 border-gray-400 text-white",
  filled: "border-sky-400 text-gray-900",
  empty: "border-gray-200 text-gray-900",
  keyCorrect: "bg-sky-500 text-white",
  keyPresent: "bg-sky-300 text-white",
  keyAbsent: "bg-gray-300 text-gray-500",
  keyIdle: "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95",
};

// Integra (Nerdle-style): green = right spot, purple = wrong spot, grey-black = unused.
const INTEGRA_THEME: BoardTheme = {
  correct: "bg-emerald-500 border-emerald-500 text-white",
  present: "bg-violet-600 border-violet-600 text-white",
  absent: "bg-gray-700 border-gray-700 text-white",
  filled: "border-gray-400 text-gray-900",
  empty: "border-gray-200 text-gray-900",
  keyCorrect: "bg-emerald-500 text-white",
  keyPresent: "bg-violet-600 text-white",
  keyAbsent: "bg-gray-700 text-white",
  keyIdle: "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95",
};

const GAME_THEMES: Partial<Record<GameKey, BoardTheme>> = {
  alfazy: ALFAZY_THEME,
  hit_and_blow: HIT_AND_BLOW_THEME,
  integra: INTEGRA_THEME,
};

/** A game's board theme, defaulting to the Alfazy palette until a game defines its own. */
export function getBoardTheme(key: GameKey): BoardTheme {
  return GAME_THEMES[key] ?? ALFAZY_THEME;
}

/** Per-game accent hex (the brand-500 override) — for canvas/inline use where CSS vars don't reach. */
export const ACCENT_HEX: Record<GameKey, string> = {
  alfazy: "#10b981", // emerald
  hit_and_blow: "#0ea5e9", // sky
  integra: "#8b5cf6", // violet
};

export function getAccentHex(key: GameKey): string {
  return ACCENT_HEX[key];
}

/** Hex tile/peg colours for the shared result image (canvas can't read CSS classes). */
const TILE_HEX: Record<GameKey, { correct: string; present: string; absent: string }> = {
  alfazy: { correct: "#10b981", present: "#d4a017", absent: "#9aa3af" },
  hit_and_blow: { correct: "#10b981", present: "#0ea5e9", absent: "#cbd5e1" },
  integra: { correct: "#10b981", present: "#8b5cf6", absent: "#4b5563" },
};
const PEG = { hit: "#10b981", blow: "#d4a017" };

export function getPalette(key: GameKey) {
  return { ...(TILE_HEX[key] ?? TILE_HEX.alfazy), ...PEG };
}
