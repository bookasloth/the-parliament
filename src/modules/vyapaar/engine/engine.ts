import {
  SALARY,
  SALARY_UNDERDOG,
  GST_RATE,
  GST_CAP,
  TAX_INCOME,
  CITIES,
  COMPANIES,
  MAX_LEVEL,
  UNMORTGAGE_RATE,
  upgradeCost,
  SETS_TO_END,
  MAX_ROUNDS,
  UNDERDOG_RATIO,
  JAIL_TURNS,
  MONSOON_POS,
} from "./data";
import type { GameState, Intent, EngineEvent } from "./state";
import type { TradeSide } from "./state";
import { BOARD } from "./board";
import { rollDie } from "./rng";
import {
  rentFor,
  companyServiceFee,
  netWorth,
  charge,
  credit,
  controlsSet,
  citiesOwned,
  controlledSets,
  scoreOf,
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
  "sell",
  "end_turn",
]);

function isUnderdog(s: GameState, seat: number): boolean {
  const nws = s.players.map((_, i) => netWorth(s, i));
  const mine = nws[seat];
  const max = Math.max(...nws);
  if (max <= 0) return false;
  const isMin = nws.every((v, i) => i === seat || mine < v);
  return isMin && mine < UNDERDOG_RATIO * max;
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
      s.players[seat].pos = MONSOON_POS;
      s.players[seat].halted = JAIL_TURNS;
      s.players[seat].doubles = 0;
      s.pendingDouble = false;
      events.push({ type: "taxraid", seat });
      s.phase = "manage";
      break;
    case "gst": {
      const amt = Math.min(GST_CAP, Math.round(s.players[seat].cash * GST_RATE));
      charge(s, seat, amt, "pot", events);
      events.push({ type: "gst", seat, amount: amt });
      finishSegment(s);
      break;
    }
    case "income":
      charge(s, seat, TAX_INCOME, "pot", events);
      events.push({ type: "income", seat, amount: TAX_INCOME });
      finishSegment(s);
      break;
    case "upi": {
      const { card, events: cardEvents } = drawCard(s, "upi");
      events.push({ type: "draw", seat, deck: "upi", card: card.id }, ...cardEvents);
      finishSegment(s);
      break;
    }
    case "headline": {
      const { card, events: cardEvents } = drawCard(s, "headline");
      events.push({ type: "draw", seat, deck: "headline", card: card.id }, ...cardEvents);
      finishSegment(s);
      break;
    }
    case "company": {
      const ci = tile.companyIndex as number;
      const owner = s.companies[ci];
      if (owner === null) {
        s.pendingCompany = ci;
        s.phase = "buy";
      } else if (owner !== seat) {
        const fee = companyServiceFee(s, ci);
        charge(s, seat, fee, owner, events);
        events.push({ type: "company_fee", seat, companyIndex: ci, amount: fee });
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
        charge(s, seat, rent, owner, events);
        events.push({ type: "rent", seat, cityId: id, to: owner, amount: rent });
        finishSegment(s);
      } else {
        finishSegment(s);
      }
      break;
    }
  }
}

function resolveAuction(s: GameState, events: EngineEvent[]): void {
  const a = s.auction!;
  let winner = -1;
  let best = 0;
  a.bids.forEach((bid, seat) => {
    const amt = bid ?? 0;
    if (amt > best) {
      best = amt;
      winner = seat;
    }
  });
  if (winner >= 0 && best > 0) {
    s.players[winner].cash -= best;
    if (a.kind === "city") s.cities[a.index].owner = winner;
    else s.companies[a.index] = winner;
    events.push({ type: "auction_won", seat: winner, kind: a.kind, index: a.index, amount: best });
  } else {
    events.push({ type: "auction_passed", kind: a.kind, index: a.index });
  }
  s.auction = null;
  s.pendingCity = null;
  s.pendingCompany = null;
  finishSegment(s);
}

function minSetLevel(s: GameState, seat: number, zone: number): number {
  const ids = citiesOwned(s, seat).filter(
    (id) => CITIES[id].zone === zone && !s.cities[id].mortgaged,
  );
  return ids.length ? Math.min(...ids.map((id) => s.cities[id].level)) : 0;
}

function canManage(s: GameState): boolean {
  return s.phase === "roll" || s.phase === "manage";
}

function validTradeSide(s: GameState, seat: number, side: TradeSide): boolean {
  if (!Number.isInteger(side.cash) || side.cash < 0) return false;
  if (side.cash > s.players[seat].cash) return false;
  const seen = new Set<number>();
  for (const id of side.cities) {
    if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    const c = s.cities[id];
    if (c.owner !== seat || c.level !== 0 || c.mortgaged) return false;
  }
  return true;
}

/** Seats best-first: score desc, then controlledSets desc, then seat asc. */
export function rankSeats(s: GameState): number[] {
  return s.players
    .map((_, seat) => seat)
    .sort((a, b) => {
      const sa = scoreOf(s, a), sb = scoreOf(s, b);
      if (sb !== sa) return sb - sa;
      const ca = controlledSets(s, a), cb = controlledSets(s, b);
      if (cb !== ca) return cb - ca;
      return a - b;
    });
}

export function winnerOf(s: GameState): number {
  return rankSeats(s)[0];
}

function endGame(s: GameState, events: EngineEvent[]): void {
  s.ended = true;
  s.winner = winnerOf(s);
  s.phase = "manage";
  events.push({ type: "game_over", seat: s.winner });
}

const LOG_CAP = 40; // rolling event log kept on the state for the client game-log panel

export function applyIntent(s: GameState, seat: number, intent: Intent): Result {
  const r = applyIntentInner(s, seat, intent);
  // Append this step's events to a capped, deterministic log (part of state → replay-safe).
  if ("state" in r && r.events.length) {
    s.log = [...(s.log ?? []), ...r.events].slice(-LOG_CAP);
  }
  return r;
}

function applyIntentInner(s: GameState, seat: number, intent: Intent): Result {
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
      s.lastRoll = [a, b];
      events.push({ type: "roll", seat, a, b });

      let brokeOut = false;
      if (p.halted > 0) {
        if (isDouble) {
          p.halted = 0;
          brokeOut = true;
        } else {
          p.halted--;
          s.pendingDouble = false;
          s.phase = "manage";
          return { state: s, events };
        }
      }

      // Jail-break roll on doubles: player moves this roll but gets no bonus
      // re-roll, and it doesn't count toward the 3-doubles jail rule.
      if (!brokeOut) p.doubles += isDouble ? 1 : 0;
      s.pendingDouble = isDouble && !brokeOut;
      if (!brokeOut && isDouble && p.doubles >= 3) {
        p.pos = MONSOON_POS;
        p.halted = JAIL_TURNS;
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
    case "buy": {
      if (s.phase !== "buy") return { error: "nothing_to_buy" };
      if (s.pendingCity !== null) {
        const id = s.pendingCity;
        const cost = CITIES[id].price;
        if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
        s.players[seat].cash -= cost;
        s.cities[id].owner = seat;
        s.pendingCity = null;
        events.push({ type: "buy", seat, cityId: id, amount: cost });
        finishSegment(s);
        return { state: s, events };
      }
      if (s.pendingCompany !== null) {
        const ci = s.pendingCompany;
        const cost = COMPANIES[ci].buy;
        if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
        s.players[seat].cash -= cost;
        s.companies[ci] = seat;
        s.pendingCompany = null;
        events.push({ type: "buy_company", seat, companyIndex: ci, amount: cost });
        finishSegment(s);
        return { state: s, events };
      }
      return { error: "nothing_to_buy" };
    }

    case "decline": {
      if (s.phase !== "buy") return { error: "nothing_to_decline" };
      if (s.pendingCity !== null) {
        s.auction = { kind: "city", index: s.pendingCity, bids: s.players.map(() => null) };
        s.phase = "auction";
        events.push({ type: "auction_start", kind: "city", index: s.pendingCity });
        return { state: s, events };
      }
      if (s.pendingCompany !== null) {
        s.auction = { kind: "company", index: s.pendingCompany, bids: s.players.map(() => null) };
        s.phase = "auction";
        events.push({ type: "auction_start", kind: "company", index: s.pendingCompany });
        return { state: s, events };
      }
      return { error: "nothing_to_decline" };
    }

    case "bid": {
      if (s.phase !== "auction" || !s.auction) return { error: "no_auction" };
      if (!Number.isInteger(intent.amount) || intent.amount < 0) return { error: "bad_bid" };
      if (intent.amount > s.players[seat].cash) return { error: "bid_exceeds_cash" };
      if (s.auction.bids[seat] !== null) return { error: "already_bid" };
      s.auction.bids[seat] = intent.amount;
      events.push({ type: "bid", seat, amount: intent.amount });
      if (s.auction.bids.every((b) => b !== null)) resolveAuction(s, events);
      return { state: s, events };
    }

    case "develop": {
      if (!canManage(s)) return { error: "cannot_manage_now" };
      const id = intent.cityId;
      if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return { error: "bad_city" };
      const c = s.cities[id];
      const z = CITIES[id].zone;
      if (c.owner !== seat) return { error: "not_owner" };
      if (c.mortgaged) return { error: "mortgaged" };
      if (!controlsSet(s, seat, z)) return { error: "no_set_control" };
      if (c.level >= MAX_LEVEL) return { error: "max_level" };
      if (c.level > minSetLevel(s, seat, z)) return { error: "uneven_build" };
      const cost = upgradeCost(id);
      if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
      s.players[seat].cash -= cost;
      c.level++;
      events.push({ type: "develop", seat, cityId: id, level: c.level, amount: cost });
      return { state: s, events };
    }

    case "mortgage": {
      if (!canManage(s)) return { error: "cannot_manage_now" };
      const id = intent.cityId;
      if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return { error: "bad_city" };
      const c = s.cities[id];
      if (c.owner !== seat) return { error: "not_owner" };
      if (c.level !== 0) return { error: "sell_upgrades_first" };
      if (c.mortgaged) return { error: "already_mortgaged" };
      const raise = Math.floor(CITIES[id].price / 2);
      s.players[seat].cash += raise;
      c.mortgaged = true;
      events.push({ type: "mortgage", seat, cityId: id, amount: raise });
      return { state: s, events };
    }

    case "unmortgage": {
      if (!canManage(s)) return { error: "cannot_manage_now" };
      const id = intent.cityId;
      if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return { error: "bad_city" };
      const c = s.cities[id];
      if (c.owner !== seat) return { error: "not_owner" };
      if (!c.mortgaged) return { error: "not_mortgaged" };
      const cost = Math.round(CITIES[id].price * UNMORTGAGE_RATE);
      if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
      s.players[seat].cash -= cost;
      c.mortgaged = false;
      events.push({ type: "unmortgage", seat, cityId: id, amount: cost });
      return { state: s, events };
    }

    case "sell": {
      if (!canManage(s)) return { error: "cannot_manage_now" };
      const id = intent.cityId;
      if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return { error: "bad_city" };
      const c = s.cities[id];
      if (c.owner !== seat) return { error: "not_owner" };
      if (c.level !== 0) return { error: "sell_upgrades_first" };
      // Sell an undeveloped city back to the bank for half its buy price; a mortgaged one nets
      // half less the outstanding mortgage (you never banked that half).
      const gross = Math.floor(CITIES[id].price / 2);
      const proceeds = c.mortgaged ? 0 : gross;
      s.players[seat].cash += proceeds;
      c.owner = null;
      c.mortgaged = false;
      events.push({ type: "sell", seat, cityId: id, amount: proceeds });
      return { state: s, events };
    }

    case "propose_trade": {
      if (s.auction) return { error: "auction_in_progress" };
      if (s.trade !== null) return { error: "trade_pending" };
      const to = intent.to;
      if (!Number.isInteger(to) || to < 0 || to >= s.players.length || to === seat) {
        return { error: "bad_recipient" };
      }
      if (!validTradeSide(s, seat, intent.give)) return { error: "bad_give" };
      if (!validTradeSide(s, to, intent.get)) return { error: "bad_get" };
      s.trade = { from: seat, to, give: intent.give, get: intent.get };
      events.push({ type: "trade_proposed", seat, to });
      return { state: s, events };
    }

    case "respond_trade": {
      if (s.auction) return { error: "auction_in_progress" };
      if (!s.trade) return { error: "no_trade" };
      if (seat !== s.trade.to) return { error: "not_recipient" };
      const t = s.trade;
      if (!intent.accept) {
        s.trade = null;
        events.push({ type: "trade_declined", seat });
        return { state: s, events };
      }
      // Atomic re-validation — assets may have changed since the proposal.
      if (!validTradeSide(s, t.from, t.give) || !validTradeSide(s, t.to, t.get)) {
        s.trade = null;
        return { error: "trade_invalid" };
      }
      for (const id of t.give.cities) s.cities[id].owner = t.to;
      for (const id of t.get.cities) s.cities[id].owner = t.from;
      s.players[t.from].cash += t.get.cash - t.give.cash;
      s.players[t.to].cash += t.give.cash - t.get.cash;
      s.trade = null;
      events.push({ type: "trade_accepted", from: t.from, to: t.to });
      return { state: s, events };
    }

    case "end_turn": {
      if (s.phase !== "manage") return { error: "cannot_end_now" };
      if (controlledSets(s, seat) >= SETS_TO_END) s.endRequested = true;
      const wrapped = seat + 1 >= s.players.length;
      s.active = (seat + 1) % s.players.length;
      if (wrapped) s.round++;
      s.players[s.active].doubles = 0;
      s.pendingDouble = false;
      s.phase = "roll";
      events.push({ type: "end_turn", seat });
      if (s.round > MAX_ROUNDS || (s.endRequested && wrapped)) endGame(s, events);
      return { state: s, events };
    }

    default:
      return { error: "not_implemented" };
  }
}

/** The minimal-legal step for a stuck/timed-out position, or null if the game is over. */
export function nextAutoIntent(s: GameState): { seat: number; intent: Intent } | null {
  if (s.ended) return null;
  switch (s.phase) {
    case "roll":
      return { seat: s.active, intent: { type: "roll" } };
    case "buy":
      return { seat: s.active, intent: { type: "decline" } };
    case "auction": {
      const seat = s.auction ? s.auction.bids.findIndex((b) => b === null) : -1;
      return seat >= 0 ? { seat, intent: { type: "bid", amount: 0 } } : null;
    }
    case "manage":
      return { seat: s.active, intent: { type: "end_turn" } };
    default:
      return null;
  }
}
