import { EVENTS } from "./data";
import type { EventId } from "./data";
import type { GameState } from "./state";
import { queuePayment } from "./helpers";

/**
 * Queue the money moves for one of the five fixed Indian-business events. Nothing is
 * charged/credited immediately any more — each move becomes a Payment the actor must
 * allow (or claim) within PAYMENT_SECONDS, or it auto-resolves with a penalty
 * (pay 2×, extra split half-bank/half-others) or, for a bank windfall, is forfeited.
 *
 * Mapping: `cash` = active claims from bank; `feeToBank` = active pays bank;
 * `collectEach` = every other (non-left) player owes active; `payEach` = active owes
 * each other; `payEachSplit` = active owes floor(val/others) to each other.
 */
export function applyEvent(s: GameState, id: EventId): void {
  const seat = s.active;
  const { op, val } = EVENTS[id];
  const others = s.players.map((_, i) => i).filter((i) => i !== seat && !s.players[i].left);
  const reason = `event:${id}`;
  switch (op) {
    case "cash":
      queuePayment(s, { actor: seat, dir: "collect", amount: val, party: "bank", reason });
      break;
    case "feeToBank":
      queuePayment(s, { actor: seat, dir: "pay", amount: val, party: "bank", reason });
      break;
    case "collectEach":
      others.forEach((i) => queuePayment(s, { actor: i, dir: "pay", amount: val, party: seat, reason }));
      break;
    case "payEach":
      others.forEach((i) => queuePayment(s, { actor: seat, dir: "pay", amount: val, party: i, reason }));
      break;
    case "payEachSplit": {
      const per = others.length ? Math.floor(val / others.length) : 0;
      others.forEach((i) => queuePayment(s, { actor: seat, dir: "pay", amount: per, party: i, reason }));
      break;
    }
  }
}
