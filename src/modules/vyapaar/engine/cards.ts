import { EVENTS } from "./data";
import type { EventId } from "./data";
import type { GameState, EngineEvent } from "./state";
import { credit, charge } from "./helpers";

/**
 * Apply one of the five fixed Indian-business events to the active player. Returns the
 * money EngineEvents produced (the landing marker `{type:"event"}` is pushed by the
 * engine caller). Deterministic — no draw, no dice, no choice.
 *
 * Money: `cash` = bank pays active; `feeToBank` = active pays bank (leaves the game);
 * `collectEach` = every other (non-left) player pays active; `payEach` = active pays each
 * other; `payEachSplit` = active pays `floor(val/others)` to each other, so no phantom
 * rupees are created (payer loses exactly per×others; any remainder stays with the payer).
 */
export function applyEvent(s: GameState, id: EventId): EngineEvent[] {
  const seat = s.active;
  const { op, val } = EVENTS[id];
  const events: EngineEvent[] = [];
  const others = s.players.map((_, i) => i).filter((i) => i !== seat && !s.players[i].left);
  switch (op) {
    case "cash":
      credit(s, seat, val);
      break;
    case "feeToBank":
      charge(s, seat, val, "bank", events);
      break;
    case "collectEach":
      others.forEach((i) => charge(s, i, val, seat, events));
      break;
    case "payEach":
      others.forEach((i) => charge(s, seat, val, i, events));
      break;
    case "payEachSplit": {
      const per = others.length ? Math.floor(val / others.length) : 0;
      others.forEach((i) => charge(s, seat, per, i, events));
      break;
    }
  }
  return events;
}
