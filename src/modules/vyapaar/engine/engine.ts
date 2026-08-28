import {
  SALARY,
  SALARY_UNDERDOG,
  MANDI_BONUS,
  CITIES,
  COMPANIES,
  MAX_LEVEL,
  HOTEL_LEVEL,
  UNMORTGAGE_RATE,
  upgradeCost,
  UPGRADE_SELL_RATIO,
  RESTRUCTURE_ADVANCE,
  RESTRUCTURE_LAPS,
  RESTRUCTURE_PENALTY,
  MAX_ROUNDS,
  UNDERDOG_RATIO,
  JAIL_TURNS,
  BRIBE_BANK,
  BRIBE_EACH,
  TRADE_UNION_BANK,
  TRADE_UNION_POOL,
  MONSOON_POS,
} from "./data";
import type { GameState, Intent, EngineEvent, TradeOffer } from "./state";
import type { TradeSide } from "./state";
import { BOARD, CITY_POS } from "./board";
import { rollDie } from "./rng";
import {
  rentFor,
  companyServiceFee,
  netWorth,
  charge,
  credit,
  queuePayment,
  controlsSet,
  citiesOwned,
  cityLeaveValue,
  controlledSets,
  scoreOf,
  cityLiquidationValue,
} from "./helpers";
import { applyEvent } from "./cards";

type Result = { state: GameState; events: EngineEvent[] } | { error: string };

const ACTIVE_ONLY = new Set<Intent["type"]>([
  "roll",
  "buy",
  "decline",
  "develop",
  "mortgage",
  "unmortgage",
  "sell",
  "restructure",
  "bribe_jail",
  "serve_jail",
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

/**
 * Whether a seat may take the one-time comeback advance: must be the underdog
 * (see isUnderdog), not have taken it already, not be mid-repayment of a startup
 * or prior restructure, and still be in the game.
 */
export function canRestructure(s: GameState, seat: number): boolean {
  const p = s.players[seat];
  if (!p || p.left || p.restructured || p.startupLaps > 0) return false;
  return isUnderdog(s, seat);
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

/**
 * Advance to the next player's turn. Shared by finishSegment (auto-end) and the
 * explicit end_turn intent. Emits an `end_turn` event for logs/clients.
 */
function advanceTurn(s: GameState, events: EngineEvent[]): void {
  const seat = s.active;
  // Advance to the next seat that hasn't left; count a round wrap when we pass the end.
  let next = seat, wrapped = false, hops = 0;
  do {
    next += 1;
    if (next >= s.players.length) { next = 0; wrapped = true; }
  } while (s.players[next].left && ++hops < s.players.length);
  s.active = next;
  if (wrapped) s.round++;
  s.players[s.active].doubles = 0;
  s.pendingDouble = false;
  // A jailed player can't roll — their turn opens in the `jail` phase (bribe out or sit it out).
  s.phase = s.players[s.active].halted > 0 ? "jail" : "roll";
  events.push({ type: "end_turn", seat });
  // The game ends only on the round cap (40) — 3-set domination no longer ends it.
  if (s.round > MAX_ROUNDS) endGame(s, events);
}

/**
 * Remove a player from the game, returning every asset to the bank and cleaning up
 * anything that referenced them so nothing is left stuck:
 *  - cancel every trade they're party to
 *  - void every pending rent they owe or are owed
 *  - pass any auction bid still waiting on them (and resolve if that completes it)
 *  - return all their cities (reset) and companies to the bank
 *  - end the game if fewer than two players remain
 *  - if it was their turn, advance so no turn is left stuck
 */
function leaveGame(s: GameState, seat: number, events: EngineEvent[]): void {
  if (s.trades?.length) {
    for (const t of s.trades) {
      if (t.from === seat || t.to === seat) events.push({ type: "trade_cancelled", tradeId: t.id, from: t.from, to: t.to });
    }
    s.trades = s.trades.filter((t) => t.from !== seat && t.to !== seat);
  }
  if (s.payments?.length) {
    // Drop any auto-payment the leaver owes or is owed — nothing left to settle.
    s.payments = s.payments.filter((p) => p.actor !== seat && p.party !== seat);
  }
  if (s.auction && s.auction.bids[seat] === null) {
    s.auction.bids[seat] = 0; // pass on their behalf
    if (s.auction.bids.every((b) => b !== null)) resolveAuction(s, events);
  }
  // Liquidate everything back to the bank at the standard sell-to-bank value so a
  // leaver keeps their built-up worth instead of forfeiting it. Cash is frozen after
  // this (no more turns/rent), so this total is exactly what settlement pays out.
  let liquidated = 0;
  for (const id of citiesOwned(s, seat)) {
    liquidated += cityLeaveValue(s, id);
    const c = s.cities[id];
    c.owner = null;
    c.level = 0;
    c.mortgaged = false;
  }
  for (let ci = 0; ci < s.companies.length; ci++) if (s.companies[ci] === seat) {
    liquidated += COMPANIES[ci].buy; // full purchase price back on leave
    s.companies[ci] = null;
  }
  s.players[seat].cash += liquidated;
  s.players[seat].left = true;
  events.push({ type: "left", seat, amount: liquidated });

  if (s.players.filter((p) => !p.left).length <= 1) {
    if (!s.ended) endGame(s, events);
    return;
  }
  // If it was the leaver's turn (and the auction resolution above didn't already move on).
  if (!s.ended && s.active === seat) {
    s.pendingCity = null;
    s.pendingCompany = null;
    advanceTurn(s, events);
  }
}

/**
 * Finish the current move segment. One roll per turn — doubles grant no bonus
 * roll — so landing always ends the segment and we auto-advance. The exception is
 * a landing on your own developable city, which pauses in `manage` first (handled
 * in resolveTile, not here) so you can build before ending the turn.
 */
function finishSegment(s: GameState, events: EngineEvent[]): void {
  advanceTurn(s, events);
}

function resolveTile(s: GameState, events: EngineEvent[]): void {
  const seat = s.active;
  const tile = BOARD[s.players[seat].pos];
  switch (tile.kind) {
    case "start":
    case "monsoon": // just visiting
      finishSegment(s, events);
      break;
    case "mandi":
      // Windfall you must claim within the window (or forfeit).
      queuePayment(s, { actor: seat, dir: "collect", amount: MANDI_BONUS, party: "bank", reason: "mandi" });
      events.push({ type: "mandi", seat, amount: MANDI_BONUS });
      finishSegment(s, events);
      break;
    case "taxraid":
      s.players[seat].pos = MONSOON_POS;
      s.players[seat].halted = JAIL_TURNS;
      s.players[seat].doubles = 0;
      s.pendingDouble = false;
      events.push({ type: "taxraid", seat });
      finishSegment(s, events);
      break;
    case "event": {
      const id = tile.eventId!;
      applyEvent(s, id); // queues Payments (allow/claim within the window, or auto-penalty)
      events.push({ type: "event", seat, event: id });
      finishSegment(s, events);
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
        // Allow within the window or it's auto-charged double (see expire_payment).
        queuePayment(s, { actor: seat, dir: "pay", amount: fee, party: owner, reason: "company_fee" });
        events.push({ type: "company_fee", seat, companyIndex: ci, amount: fee });
        finishSegment(s, events);
      } else {
        finishSegment(s, events);
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
        // Rent is a payer-confirmed auto-payment: allow within the window or it's charged
        // double (owner still gets the rent; the extra splits half-bank / half-others).
        const rent = rentFor(s, id);
        if (rent > 0) {
          queuePayment(s, { actor: seat, dir: "pay", amount: rent, party: owner, reason: "rent" });
          events.push({ type: "rent_pending", seat, cityId: id, to: owner, amount: rent });
        }
        finishSegment(s, events);
      } else {
        // Landed on your own city. Smart pause: if it's part of a set you control
        // and not yet maxed, hold in `manage` so you can develop it this turn
        // before ending (see end_turn). Nothing to build → just auto-advance.
        if (controlsSet(s, seat, CITIES[id].zone) && s.cities[id].level < MAX_LEVEL) {
          s.phase = "manage";
        } else {
          finishSegment(s, events);
        }
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
  finishSegment(s, events);
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

/** True if this seat has ANY developed (level>0) city in the given zone. While a set
 * carries houses, none of its cities may be traded away — doing so would strand the
 * buildings on a broken set (you can only hold houses when you own the whole set). */
export function setHasDevelopment(s: GameState, seat: number, zone: number): boolean {
  return s.cities.some((c, id) => c.owner === seat && CITIES[id].zone === zone && c.level > 0);
}

/**
 * A trade side is valid when it is CITIES ONLY (never cash), non-empty, and every
 * city is owned by this seat, undeveloped and unmortgaged. Cash is never part of a
 * player trade, so any non-zero cash is rejected outright. A city whose colour set
 * carries any houses is also locked (see setHasDevelopment).
 */
function validTradeSide(s: GameState, seat: number, side: TradeSide): boolean {
  if (side.cash !== 0) return false; // cash is never part of a player trade
  const cities = side.cities ?? [];
  const companies = side.companies ?? [];
  if (!Array.isArray(cities) || !Array.isArray(companies)) return false;
  if (cities.length + companies.length === 0) return false; // a side must offer something
  const seenCity = new Set<number>();
  for (const id of cities) {
    if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return false;
    if (seenCity.has(id)) return false;
    seenCity.add(id);
    const c = s.cities[id];
    if (c.owner !== seat || c.level !== 0 || c.mortgaged) return false;
    if (setHasDevelopment(s, seat, CITIES[id].zone)) return false; // set has houses → locked
  }
  const seenCo = new Set<number>();
  for (const ci of companies) {
    if (!Number.isInteger(ci) || ci < 0 || ci >= s.companies.length) return false;
    if (seenCo.has(ci)) return false;
    seenCo.add(ci);
    if (s.companies[ci] !== seat) return false; // companies have no levels/mortgage
  }
  return true;
}

/** Per-trader cost of the trader's-union charge given how many non-trader players remain. */
function tradeUnionCost(others: number): number {
  return TRADE_UNION_BANK + (others > 0 ? TRADE_UNION_POOL : 0);
}

/**
 * Apply the trader's-union charge to BOTH traders. Each pays TRADE_UNION_BANK to the bank
 * plus TRADE_UNION_POOL split evenly among the other players. Caller must have verified
 * both traders can afford tradeUnionCost() first (charge here uses plain cash, no liquidation).
 * Pushes one trade_charge event carrying the per-seat deltas for the log / money feed.
 */
function applyTradeUnionCharge(s: GameState, from: number, to: number, events: EngineEvent[]): void {
  const rest = s.players.map((_, i) => i).filter((i) => i !== from && i !== to && !s.players[i].left);
  const poolEach = rest.length ? Math.floor(TRADE_UNION_POOL / rest.length) : 0;
  const costEach = tradeUnionCost(rest.length);
  for (const trader of [from, to]) {
    s.players[trader].cash -= costEach; // full cost leaves the trader…
    rest.forEach((i) => { s.players[i].cash += poolEach; }); // …pool (floored) handed out, bank keeps the rest
  }
  events.push({ type: "trade_charge", traders: [from, to], rest, bankEach: TRADE_UNION_BANK, poolEach, costEach });
}

/** Move traded cities + companies between owners. Assumes both sides already re-validated. */
function applyTradeSwap(s: GameState, t: TradeOffer): void {
  for (const id of t.give.cities) s.cities[id].owner = t.to;
  for (const id of t.get.cities) s.cities[id].owner = t.from;
  for (const ci of t.give.companies ?? []) s.companies[ci] = t.to;
  for (const ci of t.get.companies ?? []) s.companies[ci] = t.from;
}

/** Seats best-first: left players always rank last, then score desc, controlledSets desc, seat asc. */
export function rankSeats(s: GameState): number[] {
  return s.players
    .map((_, seat) => seat)
    .sort((a, b) => {
      const la = s.players[a].left, lb = s.players[b].left;
      if (la !== lb) return la ? 1 : -1; // a player who left can never win
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
  // Settle any outstanding auto-payments at base value (no end-of-game penalty) so no
  // money is left in limbo before scoring.
  if (s.payments?.length) {
    for (const p of s.payments) {
      if (p.dir === "collect") {
        credit(s, p.actor, p.amount);
        events.push({ type: "payment_collected", seat: p.actor, amount: p.amount, reason: p.reason });
      } else {
        const paid = charge(s, p.actor, p.amount, p.party, events);
        events.push({ type: "payment_paid", seat: p.actor, to: p.party === "bank" ? undefined : p.party, amount: paid, reason: p.reason });
      }
    }
    s.payments = [];
  }
  s.ended = true;
  s.winner = winnerOf(s);
  s.phase = "manage";
  events.push({ type: "game_over", seat: s.winner });
}

/**
 * Force the game to end right now (used by the server's 60-minute wall-clock limit).
 * Settles outstanding payments + picks the winner by net worth, exactly like a natural
 * end. Returns the events so callers can persist/broadcast them. No-op if already ended.
 */
export function forceEndGame(s: GameState): EngineEvent[] {
  if (s.ended) return [];
  const events: EngineEvent[] = [];
  endGame(s, events);
  return events;
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
  if (s.players[seat]?.left) return { error: "you_left" }; // a player who left can't act (also blocks double-leave)
  if (ACTIVE_ONLY.has(intent.type) && seat !== s.active) return { error: "not_your_turn" };
  const events: EngineEvent[] = [];

  switch (intent.type) {
    case "roll": {
      if (s.phase !== "roll") return { error: "cannot_roll_now" };
      const p = s.players[seat];
      const a = rollDie(s);
      const b = rollDie(s);
      s.lastRoll = [a, b];
      events.push({ type: "roll", seat, a, b });
      // One roll per turn — doubles grant no bonus roll. (Jail is its own phase; a
      // jailed player never reaches here.)
      s.pendingDouble = false;

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
        finishSegment(s, events);
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
        finishSegment(s, events);
        return { state: s, events };
      }
      return { error: "nothing_to_buy" };
    }

    case "decline": {
      if (s.phase !== "buy") return { error: "nothing_to_decline" };
      // Players who already left auto-pass (bid 0) so the auction resolves the moment
      // every player still in the game has bid — it never waits on an absent seat.
      const openBids = () => s.players.map((p) => (p.left ? 0 : null));
      if (s.pendingCity !== null) {
        s.auction = { kind: "city", index: s.pendingCity, bids: openBids() };
        s.phase = "auction";
        events.push({ type: "auction_start", kind: "city", index: s.pendingCity });
        return { state: s, events };
      }
      if (s.pendingCompany !== null) {
        s.auction = { kind: "company", index: s.pendingCompany, bids: openBids() };
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
      // Building is only legal in `manage` — i.e. right after you ROLL and land on your own
      // set city. No building from the `roll` phase, so you can't farm a house every turn
      // without moving (you must roll the dice between builds).
      if (s.phase !== "manage") return { error: "cannot_manage_now" };
      const id = intent.cityId;
      if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return { error: "bad_city" };
      const c = s.cities[id];
      const z = CITIES[id].zone;
      if (c.owner !== seat) return { error: "not_owner" };
      if (c.mortgaged) return { error: "mortgaged" };
      if (!controlsSet(s, seat, z)) return { error: "no_set_control" };
      if (c.level >= MAX_LEVEL) return { error: "max_level" };
      if (c.level > minSetLevel(s, seat, z)) return { error: "uneven_build" };
      // Houses (building to level ≤3) can be raised from anywhere on your turn; hotels
      // (building to level ≥4) require you to be standing on that city.
      if (c.level + 1 >= HOTEL_LEVEL && s.players[seat].pos !== CITY_POS[id]) return { error: "must_be_on_city" };
      const cost = upgradeCost(id);
      if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
      s.players[seat].cash -= cost;
      c.level++;
      events.push({ type: "develop", seat, cityId: id, level: c.level, amount: cost });
      // Build as much as you can afford this visit (houses → hotels) — stays in `manage` so
      // you keep building or end the turn. You still can't build without landing on your set,
      // so there's no roll-phase farming; deep development just needs the landing.
      s.pendingCity = null;
      s.pendingCompany = null;
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
      // Sell the whole card back to the bank: card value + building value (see
      // cityLiquidationValue). Buildings are refunded so a developed city can be sold
      // outright; the tile returns to the bank fully reset.
      const proceeds = cityLiquidationValue(s, id);
      s.players[seat].cash += proceeds;
      c.owner = null;
      c.level = 0;
      c.mortgaged = false;
      events.push({ type: "sell", seat, cityId: id, amount: proceeds });
      return { state: s, events };
    }

    case "propose_trade": {
      // You may only propose on someone else's turn, and only one outgoing at a time.
      if (s.auction) return { error: "auction_in_progress" };
      if (seat === s.active) return { error: "not_while_your_turn" };
      if (!s.trades) s.trades = [];
      if (s.trades.some((t) => t.from === seat)) return { error: "trade_exists" };
      const to = intent.to;
      if (!Number.isInteger(to) || to < 0 || to >= s.players.length || to === seat || s.players[to].left) {
        return { error: "bad_recipient" };
      }
      if (!validTradeSide(s, seat, intent.give)) return { error: "bad_give" };
      if (!validTradeSide(s, to, intent.get)) return { error: "bad_get" };
      const id = s.nextTradeId ?? 1;
      s.nextTradeId = id + 1;
      // expiresAt is stamped by the server on commit (engine has no clock).
      s.trades.push({ id, from: seat, to, give: intent.give, get: intent.get, expiresAt: 0 });
      events.push({ type: "trade_proposed", seat, to, tradeId: id });
      return { state: s, events };
    }

    case "respond_trade": {
      const list = s.trades ?? [];
      const t = list.find((x) => x.id === intent.tradeId);
      if (!t) return { error: "no_trade" };
      if (seat !== t.to) return { error: "not_recipient" };
      s.trades = list.filter((x) => x.id !== t.id);
      if (!intent.accept) {
        events.push({ type: "trade_declined", seat, tradeId: t.id });
        return { state: s, events };
      }
      // Atomic re-validation — assets may have changed since the proposal.
      if (!validTradeSide(s, t.from, t.give) || !validTradeSide(s, t.to, t.get)) {
        return { error: "trade_invalid" };
      }
      // Trader's-union charge: both traders must be able to cover it in cash, else the trade
      // can't complete (we don't force-liquidate anyone to pay a trade fee).
      const restCount = s.players.filter((p, i) => i !== t.from && i !== t.to && !p.left).length;
      const unionCost = tradeUnionCost(restCount);
      if (s.players[t.from].cash < unionCost || s.players[t.to].cash < unionCost) {
        return { error: "trade_charge_unaffordable" };
      }
      applyTradeSwap(s, t);
      applyTradeUnionCharge(s, t.from, t.to, events);
      events.push({ type: "trade_accepted", from: t.from, to: t.to, tradeId: t.id });
      return { state: s, events };
    }

    case "counter_trade": {
      // Reply to an incoming trade with a fresh one going the other way. Reactive,
      // so it's allowed even on your own turn — but you still can't have two outgoing.
      const list = s.trades ?? [];
      const incoming = list.find((x) => x.id === intent.tradeId);
      if (!incoming) return { error: "no_trade" };
      if (seat !== incoming.to) return { error: "not_recipient" };
      const other = incoming.from;
      // remove the incoming offer + any existing outgoing of ours, then add the counter
      const rest = list.filter((x) => x.id !== incoming.id && x.from !== seat);
      if (!validTradeSide(s, seat, intent.give)) return { error: "bad_give" };
      if (!validTradeSide(s, other, intent.get)) return { error: "bad_get" };
      const id = s.nextTradeId ?? 1;
      s.nextTradeId = id + 1;
      rest.push({ id, from: seat, to: other, give: intent.give, get: intent.get, expiresAt: 0 });
      s.trades = rest;
      events.push({ type: "trade_countered", seat, to: other, tradeId: id, wasId: incoming.id });
      return { state: s, events };
    }

    case "withdraw_trade": {
      const list = s.trades ?? [];
      const t = list.find((x) => x.id === intent.tradeId);
      if (!t) return { error: "no_trade" };
      if (seat !== t.from) return { error: "not_proposer" };
      s.trades = list.filter((x) => x.id !== t.id);
      events.push({ type: "trade_withdrawn", seat, tradeId: t.id });
      return { state: s, events };
    }

    case "expire_trade": {
      // System-only removal (server applies it when a trade passes its 60s deadline).
      const list = s.trades ?? [];
      const t = list.find((x) => x.id === intent.tradeId);
      if (!t) return { error: "no_trade" };
      s.trades = list.filter((x) => x.id !== t.id);
      events.push({ type: "trade_expired", tradeId: t.id, from: t.from, to: t.to });
      return { state: s, events };
    }

    case "confirm_payment": {
      // Actor allows (pay) or claims (collect) an auto-payment before its deadline.
      // Off-turn legal — the actor may be a non-active player (e.g. "married" collects).
      const list = s.payments ?? [];
      const p = list.find((x) => x.id === intent.paymentId);
      if (!p) return { error: "no_payment" };
      if (p.actor !== seat) return { error: "not_your_payment" };
      s.payments = list.filter((x) => x.id !== p.id);
      if (p.dir === "collect") {
        credit(s, seat, p.amount);
        events.push({ type: "payment_collected", seat, amount: p.amount, reason: p.reason });
      } else {
        const paid = charge(s, seat, p.amount, p.party, events);
        events.push({ type: "payment_paid", seat, to: p.party === "bank" ? undefined : p.party, amount: paid, reason: p.reason });
      }
      return { state: s, events };
    }

    case "expire_payment": {
      // Deadline passed with no confirm. Debit → pay 2× (original to its destination, the
      // extra split half-to-bank / half-among the other active players). Collect → forfeit.
      const list = s.payments ?? [];
      const p = list.find((x) => x.id === intent.paymentId);
      if (!p) return { error: "no_payment" };
      s.payments = list.filter((x) => x.id !== p.id);
      // Dodge an ED raid past its 10s window → pay the raid once (no double) AND go to jail.
      if (p.reason === "event:ed_raid" && p.dir === "pay") {
        charge(s, p.actor, p.amount, "bank", events);
        s.players[p.actor].pos = MONSOON_POS;
        s.players[p.actor].halted = JAIL_TURNS;
        s.players[p.actor].doubles = 0;
        if (p.actor === s.active) s.pendingDouble = false;
        events.push({ type: "ed_raid_jail", seat: p.actor, amount: p.amount });
        return { state: s, events };
      }
      if (p.dir === "collect") {
        events.push({ type: "payment_forfeited", seat: p.actor, amount: p.amount, reason: p.reason });
        return { state: s, events };
      }
      charge(s, p.actor, p.amount, p.party, events); // the original obligation
      const extra = p.amount;
      const toBank = Math.floor(extra / 2);
      charge(s, p.actor, toBank, "bank", events);
      const rest = extra - toBank;
      const others = s.players.map((_, i) => i).filter((i) => i !== p.actor && !s.players[i].left);
      if (others.length && rest > 0) {
        const per = Math.floor(rest / others.length);
        if (per > 0) others.forEach((i) => charge(s, p.actor, per, i, events));
      }
      events.push({ type: "payment_penalty", seat: p.actor, amount: p.amount, reason: p.reason });
      return { state: s, events };
    }

    case "restructure": {
      // One-time comeback advance for the underdog, repaid via reduced salary over
      // the next RESTRUCTURE_LAPS laps (reuses the startup-penalty machinery).
      if (!canManage(s)) return { error: "cannot_manage_now" };
      if (!canRestructure(s, seat)) return { error: "cannot_restructure" };
      const p = s.players[seat];
      p.cash += RESTRUCTURE_ADVANCE;
      p.startupLaps = RESTRUCTURE_LAPS;
      p.startupPenalty = RESTRUCTURE_PENALTY;
      p.restructured = true;
      events.push({ type: "restructure", seat, amount: RESTRUCTURE_ADVANCE });
      return { state: s, events };
    }

    case "bribe_jail": {
      // Buy your way out of jail NOW: pay the bank BRIBE_BANK plus BRIBE_EACH to every
      // other player still in the game ("to stay silent" — automatic, no approval). Freed
      // this turn, then you roll. Refused if you can't cover the whole bribe.
      if (s.phase !== "jail") return { error: "not_in_jail" };
      const p = s.players[seat];
      const others = s.players.map((_, i) => i).filter((i) => i !== seat && !s.players[i].left);
      const total = BRIBE_BANK + BRIBE_EACH * others.length;
      if (p.cash < total) return { error: "insufficient_funds" };
      p.cash -= total; // BRIBE_BANK vanishes to the bank; the rest is handed out below
      others.forEach((i) => { s.players[i].cash += BRIBE_EACH; });
      p.halted = 0;
      s.phase = "roll";
      events.push({ type: "bribe", seat, bank: BRIBE_BANK, each: BRIBE_EACH, others: others.length, amount: total });
      return { state: s, events };
    }

    case "serve_jail": {
      // Sit the turn out. Serve one jail turn and pass — no dice, no move.
      if (s.phase !== "jail") return { error: "not_in_jail" };
      s.players[seat].halted -= 1;
      events.push({ type: "jail_served", seat, left: s.players[seat].halted });
      advanceTurn(s, events);
      return { state: s, events };
    }

    case "leave_game": {
      // Legal at any time (off-turn included). The left-guard at the top makes a
      // second leave a no-op error, so this is idempotent.
      leaveGame(s, seat, events);
      return { state: s, events };
    }

    case "end_turn": {
      // Turns auto-advance on landing (see finishSegment); an explicit end_turn is
      // only legal in the vestigial manage state and otherwise a no-op error.
      if (s.phase !== "manage" || s.ended) return { error: "cannot_end_now" };
      advanceTurn(s, events);
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
    case "jail":
      // On timeout a jailed player just sits it out (never auto-bribes — that'd drain them).
      return { seat: s.active, intent: { type: "serve_jail" } };
    default:
      return null;
  }
}
