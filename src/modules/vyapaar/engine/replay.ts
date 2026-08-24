import { createGame } from "./state";
import type { GameState, Intent } from "./state";
import { applyIntent } from "./engine";

export function replay(
  seed: number,
  names: string[],
  log: { seat: number; intent: Intent }[],
  openingCash?: number,
): GameState {
  const s = createGame(seed, names, openingCash);
  for (const { seat, intent } of log) {
    applyIntent(s, seat, intent); // errors are no-ops by construction of the log
  }
  return s;
}
