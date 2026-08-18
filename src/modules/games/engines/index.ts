/** Engine registry: GameKey → GameEngine. Add a game = add its engine here. */

import type { GameKey } from "@/config/games";
import type { GameEngine } from "./types";
import { alfazyEngine } from "./alfazy";

const ENGINES: Partial<Record<GameKey, GameEngine>> = {
  alfazy: alfazyEngine,
};

/** The engine for a game key. Throws if the game has no engine yet (coming_soon). */
export function getEngine(key: GameKey): GameEngine {
  const e = ENGINES[key];
  if (!e) throw new Error(`no engine for game: ${key}`);
  return e;
}

export function hasEngine(key: GameKey): boolean {
  return !!ENGINES[key];
}

export type { GameEngine, PlayResult } from "./types";
export { emojiGrid, runGame } from "./types";
export type { Tile, KeyRow, KeyDef } from "./types";
