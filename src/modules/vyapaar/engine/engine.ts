import {
  SALARY,
  SALARY_UNDERDOG,
  GST_RATE,
  GST_CAP,
  TAX_INCOME,
  CITIES,
  HUB_PRICE,
  MAX_LEVEL,
  UNMORTGAGE_RATE,
  upgradeCost,
  SETS_TO_END,
  MAX_ROUNDS,
} from "./data";
import type { GameState, Intent, EngineEvent } from "./state";
import type { TradeSide } from "./state";
import { BOARD } from "./board";
import { rollDie } from "./rng";
import {
  rentFor,
  hubRentFor,
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
        charge(s, seat, rent, owner, events);
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
    s.cities[a.cityId].owner = winner;
    events.push({ type: "auction_won", seat: winner, cityId: a.cityId, amount: best });
  } else {
    events.push({ type: "auction_passed", cityId: a.cityId });
  }
  s.auction = null;
  s.pendingCity = null;
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

export function winnerOf(s: GameState): number {
  let best = 0;
  for (let i = 1; i < s.players.length; i++) {
    const si = scoreOf(s, i);
    const sb = scoreOf(s, best);
    if (si > sb) best = i;
    else if (si === sb && controlledSets(s, i) > controlledSets(s, best)) best = i;
  }
  return best;
}

function endGame(s: GameState, events: EngineEvent[]): void {
  s.ended = true;
  s.winner = winnerOf(s);
  s.phase = "manage";
  events.push({ type: "game_over", seat: s.winner });
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
      if (s.pendingHub !== null) {
        const hi = s.pendingHub;
        if (s.players[seat].cash < HUB_PRICE) return { error: "insufficient_funds" };
        s.players[seat].cash -= HUB_PRICE;
        s.hubs[hi] = seat;
        s.pendingHub = null;
        events.push({ type: "buy_hub", seat, hubIndex: hi, amount: HUB_PRICE });
        finishSegment(s);
        return { state: s, events };
      }
      return { error: "nothing_to_buy" };
    }

    case "decline": {
      if (s.phase !== "buy") return { error: "nothing_to_decline" };
      if (s.pendingHub !== null) {
        s.pendingHub = null; // hubs are not auctioned
        finishSegment(s);
        return { state: s, events };
      }
      if (s.pendingCity !== null) {
        s.auction = { cityId: s.pendingCity, bids: s.players.map(() => null) };
        s.phase = "auction";
        events.push({ type: "auction_start", cityId: s.pendingCity });
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

    case "propose_trade": {
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

/** One minimal-legal step for a timed-out player. Caller loops until active changes or game ends. */
export function autoResolve(s: GameState): { state: GameState; events: EngineEvent[] } {
  if (s.ended) return { state: s, events: [] };
  const active = s.active;
  switch (s.phase) {
    case "roll":
      return applyIntent(s, active, { type: "roll" }) as { state: GameState; events: EngineEvent[] };
    case "buy":
      return applyIntent(s, active, { type: "decline" }) as { state: GameState; events: EngineEvent[] };
    case "auction": {
      // make every seat that hasn't bid pass, so the auction resolves
      const seat = s.auction!.bids.findIndex((b) => b === null);
      return applyIntent(s, seat, { type: "bid", amount: 0 }) as { state: GameState; events: EngineEvent[] };
    }
    case "manage":
      return applyIntent(s, active, { type: "end_turn" }) as { state: GameState; events: EngineEvent[] };
    default:
      return { state: s, events: [] };
  }
}
