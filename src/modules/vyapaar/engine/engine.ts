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
  SETS_TO_END,
  MAX_ROUNDS,
  UNDERDOG_RATIO,
  JAIL_TURNS,
  MONSOON_POS,
} from "./data";
import type { GameState, Intent, EngineEvent, PendingRent, TradeOffer } from "./state";
import type { TradeSide } from "./state";
import { BOARD, CITY_POS } from "./board";
import { rollDie } from "./rng";
import {
  rentFor,
  companyServiceFee,
  netWorth,
  charge,
  credit,
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
 * Settle one pending rent: pay it (auto-liquidating the payer if short), unless
 * the owner no longer owns the city (traded/sold since) — then it's voided.
 * `reason` distinguishes a manual collect from the one-lap auto-settle for logs.
 */
function settleRent(s: GameState, rent: PendingRent, events: EngineEvent[], reason: "collected" | "auto"): void {
  if (s.cities[rent.cityId]?.owner !== rent.owner) {
    events.push({ type: "rent_void", seat: rent.payer, cityId: rent.cityId, to: rent.owner, rentId: rent.id });
    return;
  }
  const paid = charge(s, rent.payer, rent.amount, rent.owner, events);
  events.push({ type: "rent", seat: rent.payer, cityId: rent.cityId, to: rent.owner, amount: paid, rentId: rent.id, reason });
}

/** Age pending rents by one turn; auto-settle any that have waited a full lap. */
function ageAndAutoSettleRents(s: GameState, events: EngineEvent[]): void {
  if (!s.pendingRents?.length) return;
  const lap = s.players.length;
  const keep: PendingRent[] = [];
  for (const r of s.pendingRents) {
    r.age++;
    if (r.age >= lap) settleRent(s, r, events, "auto");
    else keep.push(r);
  }
  s.pendingRents = keep;
}

/**
 * Advance to the next player's turn. Shared by finishSegment (auto-end) and the
 * explicit end_turn intent. Emits an `end_turn` event for logs/clients.
 */
function advanceTurn(s: GameState, events: EngineEvent[]): void {
  const seat = s.active;
  ageAndAutoSettleRents(s, events);
  if (controlledSets(s, seat) >= SETS_TO_END) s.endRequested = true;
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
  s.phase = "roll";
  events.push({ type: "end_turn", seat });
  if (s.round > MAX_ROUNDS || (s.endRequested && wrapped)) endGame(s, events);
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
  if (s.pendingRents?.length) {
    for (const r of s.pendingRents) {
      if (r.payer === seat || r.owner === seat) events.push({ type: "rent_void", seat: r.payer, cityId: r.cityId, to: r.owner, rentId: r.id });
    }
    s.pendingRents = s.pendingRents.filter((r) => r.payer !== seat && r.owner !== seat);
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
      credit(s, seat, MANDI_BONUS);
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
      const evs = applyEvent(s, id);
      events.push({ type: "event", seat, event: id }, ...evs);
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
        charge(s, seat, fee, owner, events);
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
        // Don't charge now — the owner gets a "someone visited your city" prompt
        // and collects. Auto-settles after one lap (see advanceTurn) so an AFK
        // owner can never stall the game. Amount is snapshotted here.
        const rent = rentFor(s, id);
        if (rent > 0) {
          if (!s.pendingRents) s.pendingRents = [];
          const rentId = s.nextRentId ?? 1;
          s.nextRentId = rentId + 1;
          s.pendingRents.push({ id: rentId, payer: seat, owner, cityId: id, amount: rent, age: 0 });
          events.push({ type: "rent_pending", seat, cityId: id, to: owner, amount: rent, rentId });
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

/**
 * A trade side is valid when it is CITIES ONLY (never cash), non-empty, and every
 * city is owned by this seat, undeveloped and unmortgaged. Cash is never part of a
 * player trade, so any non-zero cash is rejected outright.
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
  // Settle any outstanding rents before scoring so no money is left in limbo.
  if (s.pendingRents?.length) {
    for (const r of s.pendingRents) settleRent(s, r, events, "auto");
    s.pendingRents = [];
  }
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
  if (s.players[seat]?.left) return { error: "you_left" }; // a player who left can't act (also blocks double-leave)
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
          finishSegment(s, events);
          return { state: s, events };
        }
      }

      // One roll per turn: doubles grant no bonus roll and there is no
      // three-doubles jail rule. (Doubles still break you out of jail, above.)
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
      // Houses (building to level ≤3) can be raised from anywhere on your turn; hotels
      // (building to level ≥4) require you to be standing on that city.
      if (c.level + 1 >= HOTEL_LEVEL && s.players[seat].pos !== CITY_POS[id]) return { error: "must_be_on_city" };
      const cost = upgradeCost(id);
      if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
      s.players[seat].cash -= cost;
      c.level++;
      events.push({ type: "develop", seat, cityId: id, level: c.level, amount: cost });
      // One build per turn: developing IS your move — you don't also roll. End the turn.
      s.pendingCity = null;
      s.pendingCompany = null;
      advanceTurn(s, events);
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
      applyTradeSwap(s, t);
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

    case "collect_rent": {
      // Owner collects an owed rent from the notification. Off-turn: legal anytime.
      // Idempotent — the id is removed on collect, so a double-click errors.
      const list = s.pendingRents ?? [];
      const idx = list.findIndex((r) => r.id === intent.rentId);
      if (idx < 0) return { error: "no_such_rent" };
      const rent = list[idx];
      if (rent.owner !== seat) return { error: "not_your_rent" };
      settleRent(s, rent, events, "collected");
      s.pendingRents = list.filter((_, i) => i !== idx);
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
    default:
      return null;
  }
}
