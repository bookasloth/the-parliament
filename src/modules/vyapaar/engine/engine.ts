import {
  SALARY,
  SALARY_UNDERDOG,
  GST_RATE,
  GST_CAP,
  TAX_INCOME,
} from "./data";
import type { GameState, Intent, EngineEvent } from "./state";
import { BOARD } from "./board";
import { rollDie } from "./rng";
import {
  rentFor,
  hubRentFor,
  netWorth,
  charge,
  credit,
} from "./helpers";
import { drawCard } from "./cards";

type Result = { state: GameState; events: EngineEvent[] } | { error: string };

const ACTIVE_ONLY = new Set<Intent["type"]>([
  "roll",
  "buy",
  "decline",
  "develop",
  "mortgage",
  "unmortgage",
  "end_turn",
]);

function isUnderdog(s: GameState, seat: number): boolean {
  const nws = s.players.map((_, i) => netWorth(s, i));
  const mine = nws[seat];
  const max = Math.max(...nws);
  if (max <= 0) return false;
  const isMin = nws.every((v, i) => i === seat || mine < v);
  return isMin && mine < 0.6 * max;
}

function passStartSalary(s: GameState, seat: number, events: EngineEvent[]): void {
  let pay = isUnderdog(s, seat) ? SALARY_UNDERDOG : SALARY;
  const p = s.players[seat];
  if (p.startupLaps > 0) {
    pay -= p.startupPenalty;
    p.startupLaps--;
  }
  pay = Math.max(0, pay);
  credit(s, seat, pay);
  events.push({ type: "salary", seat, amount: pay });
}

/** Finish the current move segment: roll again on a double, else manage phase. */
function finishSegment(s: GameState): void {
  s.phase = s.pendingDouble ? "roll" : "manage";
}

function resolveTile(s: GameState, events: EngineEvent[]): void {
  const seat = s.active;
  const tile = BOARD[s.players[seat].pos];
  switch (tile.kind) {
    case "start":
    case "monsoon": // just visiting
      finishSegment(s);
      break;
    case "mandi":
      credit(s, seat, s.pot);
      events.push({ type: "mandi", seat, amount: s.pot });
      s.pot = 0;
      finishSegment(s);
      break;
    case "taxraid":
      s.players[seat].pos = 10;
      s.players[seat].halted = 2;
      s.players[seat].doubles = 0;
      s.pendingDouble = false;
      events.push({ type: "taxraid", seat });
      s.phase = "manage";
      break;
    case "gst": {
      const amt = Math.min(GST_CAP, Math.round(s.players[seat].cash * GST_RATE));
      charge(s, seat, amt, "pot");
      events.push({ type: "gst", seat, amount: amt });
      finishSegment(s);
      break;
    }
    case "income":
      charge(s, seat, TAX_INCOME, "pot");
      events.push({ type: "income", seat, amount: TAX_INCOME });
      finishSegment(s);
      break;
    case "upi": {
      const { card } = drawCard(s, "upi");
      events.push({ type: "draw", seat, deck: "upi", card: card.id });
      finishSegment(s);
      break;
    }
    case "headline": {
      const { card } = drawCard(s, "headline");
      events.push({ type: "draw", seat, deck: "headline", card: card.id });
      finishSegment(s);
      break;
    }
    case "hub": {
      const hi = tile.hubIndex as number;
      const owner = s.hubs[hi];
      if (owner === null) {
        s.pendingHub = hi;
        s.phase = "buy";
      } else if (owner !== seat) {
        const rent = hubRentFor(s, hi);
        charge(s, seat, rent, owner);
        events.push({ type: "hub_rent", seat, hubIndex: hi, amount: rent });
        finishSegment(s);
      } else {
        finishSegment(s);
      }
      break;
    }
    case "city": {
      const id = tile.cityId as number;
      const owner = s.cities[id].owner;
      if (owner === null) {
        s.pendingCity = id;
        s.phase = "buy";
      } else if (owner !== seat) {
        const rent = rentFor(s, id);
        charge(s, seat, rent, owner);
        events.push({ type: "rent", seat, cityId: id, to: owner, amount: rent });
        finishSegment(s);
      } else {
        finishSegment(s);
      }
      break;
    }
  }
}

export function applyIntent(s: GameState, seat: number, intent: Intent): Result {
  if (s.ended) return { error: "game_over" };
  if (ACTIVE_ONLY.has(intent.type) && seat !== s.active) return { error: "not_your_turn" };
  const events: EngineEvent[] = [];

  switch (intent.type) {
    case "roll": {
      if (s.phase !== "roll") return { error: "cannot_roll_now" };
      const p = s.players[seat];
      const a = rollDie(s);
      const b = rollDie(s);
      const isDouble = a === b;
      events.push({ type: "roll", seat, a, b });

      if (p.halted > 0) {
        if (isDouble) {
          p.halted = 0;
        } else {
          p.halted--;
          s.pendingDouble = false;
          s.phase = "manage";
          return { state: s, events };
        }
      }

      p.doubles += isDouble ? 1 : 0;
      s.pendingDouble = isDouble;
      if (isDouble && p.doubles >= 3) {
        p.pos = 10;
        p.halted = 2;
        p.doubles = 0;
        s.pendingDouble = false;
        s.phase = "manage";
        events.push({ type: "jail_doubles", seat });
        return { state: s, events };
      }

      const sum = p.pos + a + b;
      if (sum >= 40) passStartSalary(s, seat, events);
      p.pos = sum % 40;
      resolveTile(s, events);
      return { state: s, events };
    }
    default:
      return { error: "not_implemented" };
  }
}
