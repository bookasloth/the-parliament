import { CITIES, COMPANIES, MAX_LEVEL, HOTEL_LEVEL, SET_OWN_NEEDED, BRIBE_BANK, BRIBE_EACH, MAX_ROUNDS, upgradeCost } from "./engine/data";
import { CITY_POS } from "./engine/board";
import { citiesOwned, controlsSet, companiesOwned, netWorth } from "./engine/helpers";
import { applyIntent, setHasDevelopment, canRestructure } from "./engine/engine";
import type { GameState, Intent, TradeOffer, EngineEvent } from "./engine/state";

// Computer players ("Vyapaari bots") so games can run without a full table of humans.
// Bots are backed by real, fixed User rows (userId is a required FK) seeded once via
// prisma/seeds/vyapaar-bots.sql — their ids are the constants below, so a seat is a bot
// iff its userId is in this set (no schema flag, no per-turn lookup).

const TOK = "https://company-assets.bookasloth.in/nnawca/images/tokens";

// ── Play style ────────────────────────────────────────────────────────────────────────────
// A bundle of INDEPENDENT knobs (no single "aggressive" switch), so opponents feel different.
// The three base tempers (cautious/normal/aggressive) stay for tuning + tests; the four named
// ARCHETYPES layer distinct personalities on top of the same knobs. Resolved from the (fixed)
// bot userId at drive time — NOT stored in game state, so it survives a replay/rebuild without
// going stale. Every trait is a DETERMINISTIC function of persona + board (no randomness) so
// matches stay replay/audit/resume-safe.
export type BotPersona =
  | "cautious" | "normal" | "aggressive"      // base tempers
  | "landlord" | "trader" | "shark" | "turtle"; // named archetypes
interface PersonaCfg {
  reserve: number;    // cash buffer kept for a normal (tier-2) buy / build
  ampleMult: number;  // "flush" = reserve × this; a disciplined bot only opens a new zone when flush
  auctionCap: number; // fraction of a lot's WORTH-to-me the bot bids (can exceed 1 → outbids sticker)
  sprawl: boolean;    // open any new zone freely (true) vs only when flush (false)
  focus: boolean;     // hoard ONE zone: never open a brand-new colour (the Landlord)
  bribeJail: boolean; // pay out of jail early-game when flush (vs always sit it out)
  trades: boolean;    // participates in trading at all (the Turtle never does)
  denyBid: boolean;   // pay a premium at auction to deny a one-away rival/human (the Shark)
  valueUpTrade: boolean;  // accept a set-neutral fair land-grab (more cities in than out)
  premiumTrades: boolean; // overpay in a swap to complete/advance a set (risk appetite)
  overLeverage: boolean;  // develop past a prudent reserve → deterministically runs short, misses rent
  gangLeader: boolean;    // refuse to trade with the current net-worth leader
  holdMonopoly: boolean;  // never hand a rival the card that completes their set
}
const RESERVE_FLOOR = 500; // a set-completing buy/bid may spend down to this, below the normal reserve
const EARLY_ROUNDS = 10;   // bribing out of jail is worth it while property is still unclaimed
const ENDGAME_ROUND = MAX_ROUNDS - 8; // late game: stop opening new zones, pour cash into owned sets
const HOTEL_ROUND = 15;    // houses first: a plain bot only starts hotels once the game has matured

const PERSONA: Record<BotPersona, PersonaCfg> = {
  // base tempers
  cautious:   { reserve: 4000, ampleMult: 4, auctionCap: 0.7,  sprawl: false, focus: false, bribeJail: false, trades: true,  denyBid: false, valueUpTrade: false, premiumTrades: false, overLeverage: false, gangLeader: false, holdMonopoly: false },
  normal:     { reserve: 2000, ampleMult: 3, auctionCap: 0.9,  sprawl: false, focus: false, bribeJail: true,  trades: true,  denyBid: false, valueUpTrade: false, premiumTrades: false, overLeverage: false, gangLeader: false, holdMonopoly: false },
  aggressive: { reserve: 500,  ampleMult: 2, auctionCap: 1.25, sprawl: true,  focus: false, bribeJail: true,  trades: true,  denyBid: false, valueUpTrade: true,  premiumTrades: true,  overLeverage: true,  gangLeader: true,  holdMonopoly: true },
  // ── archetypes ──
  // The Landlord: hoards one zone, hotels fast, overpays to lock it, won't sprawl.
  landlord:   { reserve: 1500, ampleMult: 2, auctionCap: 1.0,  sprawl: false, focus: true,  bribeJail: true,  trades: true,  denyBid: false, valueUpTrade: false, premiumTrades: true,  overLeverage: true,  gangLeader: false, holdMonopoly: true },
  // The Trader: proposes constantly, runs thin cash, grabs any fair swap.
  trader:     { reserve: 500,  ampleMult: 2, auctionCap: 0.8,  sprawl: true,  focus: false, bribeJail: true,  trades: true,  denyBid: false, valueUpTrade: true,  premiumTrades: true,  overLeverage: false, gangLeader: false, holdMonopoly: false },
  // The Shark: denial + coalition — bids to block, schemes against the leader, hoards monopolies.
  shark:      { reserve: 2000, ampleMult: 2, auctionCap: 1.2,  sprawl: false, focus: false, bribeJail: true,  trades: true,  denyBid: true,  valueUpTrade: false, premiumTrades: false, overLeverage: false, gangLeader: true,  holdMonopoly: true },
  // The Turtle: never trades, hoards cash, plays for a high net-worth settlement.
  turtle:     { reserve: 6000, ampleMult: 5, auctionCap: 0.5,  sprawl: false, focus: false, bribeJail: false, trades: false, denyBid: false, valueUpTrade: false, premiumTrades: false, overLeverage: false, gangLeader: false, holdMonopoly: true },
};

// The seat currently ahead (highest net worth), or -1 if none — the target `gangLeader` schemes against.
export function leaderSeat(s: GameState): number {
  let best = -1, bestNW = -Infinity;
  for (let i = 0; i < s.players.length; i++) {
    if (s.players[i].left) continue;
    const nw = netWorth(s, i);
    if (nw > bestNW) { bestNW = nw; best = i; }
  }
  return best;
}

export const BOT_USERS = [
  { id: "00000000-0000-4000-8000-0000000000b1", username: "bot_abuddhi", name: "A Buddhi",       cash: 200000, token: `${TOK}/bot-abuddhi.png`, persona: "turtle"   as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b2", username: "bot_vflash",  name: "V Flash",        cash: 200000, token: `${TOK}/bot-vflash.png`,  persona: "trader"   as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b3", username: "bot_dkboss",  name: "DK Boss",        cash: 100000, token: `${TOK}/bot-dkboss.png`,  persona: "shark"    as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b4", username: "bot_chimlig", name: "Chimli G",       cash: 100000, token: `${TOK}/bot-chimlig.png`, persona: "landlord" as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b5", username: "bot_pkaddoo", name: "P Kaddoo",       cash: 150000, token: `${TOK}/bot-pkaddoo.png`, persona: "shark"    as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b6", username: "bot_dhamma",  name: "Little Dhamma",  cash: 150000, token: `${TOK}/bot-dhamma.png`,  persona: "landlord" as BotPersona },
] as const;
const BOT_BY_ID = new Map<string, (typeof BOT_USERS)[number]>(BOT_USERS.map((b) => [b.id, b]));

export function isBotUserId(userId: string): boolean {
  return BOT_BY_ID.has(userId);
}

/** A bot's play style, or "normal" for a non-bot / unknown id. */
export function personaFor(userId: string): BotPersona {
  return BOT_BY_ID.get(userId)?.persona ?? "normal";
}

/** A bot's fixed opening stack (they never settle to a real wallet), or a default. */
export function botOpeningCash(userId: string): number {
  return BOT_BY_ID.get(userId)?.cash ?? 150000;
}

/** A bot's special board token, or null for a non-bot. */
export function botToken(userId: string): string | null {
  return BOT_BY_ID.get(userId)?.token ?? null;
}

// ── board-value helpers (all pure, deterministic) ───────────────────────────────────────────

/** Cities `seat` owns, unmortgaged, in `zone`. */
function ownedInZone(s: GameState, seat: number, zone: number): number {
  let n = 0;
  for (let id = 0; id < CITIES.length; id++) {
    if (CITIES[id].zone === zone && s.cities[id].owner === seat && !s.cities[id].mortgaged) n++;
  }
  return n;
}

/** Would buying/holding this free city deny a rival who is one card short of the zone? */
function deniesRival(s: GameState, seat: number, id: number): boolean {
  const zone = CITIES[id].zone;
  for (let r = 0; r < s.players.length; r++) {
    if (r === seat || s.players[r].left) continue;
    if (ownedInZone(s, r, zone) === SET_OWN_NEEDED - 1) return true;
  }
  return false;
}

/**
 * Strategic value tier of acquiring city `id` for `seat`, judged against the board RIGHT NOW:
 *   3 = completes a set     2 = progresses a set you're in, or denies a one-away rival
 *   1 = opens a new zone / adds depth to one you already control     0 = worthless
 */
function cityTier(s: GameState, seat: number, id: number): number {
  const zone = CITIES[id].zone;
  const owned = ownedInZone(s, seat, zone);
  if (owned === SET_OWN_NEEDED - 1) return 3;
  if (owned >= 1 && owned < SET_OWN_NEEDED) return 2;
  if (owned === 0 && deniesRival(s, seat, id)) return 2;
  return 1;
}

/** True if `seat` can afford `price` and still hold the buffer that `tier` demands. */
function affordsBuy(s: GameState, seat: number, price: number, tier: number, cfg: PersonaCfg): boolean {
  const cash = s.players[seat].cash;
  if (tier >= 3) return cash - price >= RESERVE_FLOOR;
  if (tier === 2) return cash - price >= cfg.reserve;
  if (tier === 1) return cash - price >= (cfg.sprawl ? cfg.reserve : cfg.reserve * cfg.ampleMult);
  return false;
}

/** What an auction lot is worth to `seat`, in rupees — set-completers are worth OVER sticker. */
function auctionWorth(s: GameState, seat: number, kind: "city" | "company", index: number, cfg: PersonaCfg): number {
  if (kind === "city") {
    const base = CITIES[index].price;
    const tier = cityTier(s, seat, index);
    let mult = tier >= 3 ? 1.3 : tier === 2 ? 0.85 : tier === 1 ? 0.45 : 0.1;
    if (cfg.denyBid && deniesRival(s, seat, index)) mult = Math.max(mult, 1.1); // pay to block
    return base * mult;
  }
  const base = COMPANIES[index].buy;
  const pair = s.companies[COMPANIES[index].partner] === seat;
  return base * (pair ? 1.3 : companiesOwned(s, seat) === 0 ? 0.6 : 0.2);
}

// Should the bot pour money into HOTELS (levels 4-6) yet, or keep laying houses first? Houses are
// the best rent-per-rupee; hotels are a heavy late-game press. So a plain bot builds houses across
// its set and only starts hotels once the game has matured — a hotel-rusher (Landlord/aggressive)
// presses them as soon as the set is fully housed. Stops bots dumping their stack into hotels the
// instant they complete a set.
function wantsHotels(s: GameState, cfg: PersonaCfg): boolean {
  return cfg.focus || cfg.overLeverage || s.round >= HOTEL_ROUND;
}

// Cheapest even-build target in a set the bot controls that it can afford right now, or null.
// Mirrors the engine's develop rules (even-build, hotels need you on the tile) so the chosen intent
// is never rejected. Houses use `houseReserve`; hotels are gated by `allowHotels` and kept behind a
// larger `hotelReserve` so they never bankrupt the bot.
function developTarget(s: GameState, seat: number, houseReserve: number, hotelReserve: number, allowHotels: boolean): number | null {
  const p = s.players[seat];
  let best: number | null = null;
  let bestCost = Infinity;
  for (let z = 0; z < 5; z++) {
    if (!controlsSet(s, seat, z)) continue;
    const setCities = citiesOwned(s, seat).filter((id) => CITIES[id].zone === z && !s.cities[id].mortgaged);
    if (!setCities.length) continue;
    const minLvl = Math.min(...setCities.map((id) => s.cities[id].level));
    for (const id of setCities) {
      if (s.cities[id].level >= MAX_LEVEL) continue;
      if (s.cities[id].level !== minLvl) continue; // even-build: raise the lowest first
      const isHotel = s.cities[id].level + 1 >= HOTEL_LEVEL; // building into 4-6 = a hotel
      if (isHotel && !allowHotels) continue;                 // houses-first: don't rush hotels
      if (isHotel && p.pos !== CITY_POS[id]) continue;        // hotels need you on the tile
      const cost = upgradeCost(id);
      if (p.cash - cost < (isHotel ? hotelReserve : houseReserve)) continue;
      if (cost < bestCost) { best = id; bestCost = cost; }
    }
  }
  return best;
}

// A mortgaged city `seat` owns whose set it still controls once cleared — worth redeeming when flush.
function unmortgageTarget(s: GameState, seat: number, reserve: number): number | null {
  for (const id of citiesOwned(s, seat)) {
    const c = s.cities[id];
    if (!c.mortgaged) continue;
    const cost = Math.round(CITIES[id].price * 0.55); // UNMORTGAGE_RATE
    if (s.players[seat].cash - cost < reserve) continue;
    if (controlsSet(s, seat, CITIES[id].zone)) return id;
  }
  return null;
}

// The bot brain: one legal intent for `seat`. Pure + deterministic. Reasons by board VALUE, not
// fixed thresholds: pay debts, take the underdog comeback, buy/bid what's worth it (completing sets
// even below the normal reserve), keep pairs, build, manage jail like a player would.
export function botIntent(s: GameState, seat: number, persona: BotPersona = "normal"): Intent {
  const p = s.players[seat];
  const cfg = PERSONA[persona];

  // 1. Always clear a debt you owe first (dodging it = 2× or, for ED raids, jail).
  const owed = (s.payments ?? []).find((x) => x.actor === seat);
  if (owed) return { type: "confirm_payment", paymentId: owed.id };

  // 2. Comeback: trailing underdog takes the one-time restructure advance (legal in roll/manage).
  if ((s.phase === "roll" || s.phase === "manage") && canRestructure(s, seat)) {
    return { type: "restructure" };
  }

  switch (s.phase) {
    case "roll":
      return { type: "roll" };

    case "jail": {
      const others = s.players.map((_, i) => i).filter((i) => i !== seat && !s.players[i].left);
      const total = BRIBE_BANK + BRIBE_EACH * others.length;
      if (cfg.bribeJail && s.round <= EARLY_ROUNDS && p.cash - total >= cfg.reserve) {
        return { type: "bribe_jail" };
      }
      return { type: "serve_jail" };
    }

    case "buy": {
      if (s.pendingCity !== null) {
        const id = s.pendingCity;
        const zone = CITIES[id].zone;
        const tier = cityTier(s, seat, id);
        // Opening a BRAND-NEW zone: a focused (Landlord) bot never does; nobody does late-game.
        const newZone = ownedInZone(s, seat, zone) === 0;
        if (tier === 1 && newZone && (cfg.focus || s.round >= ENDGAME_ROUND)) return { type: "decline" };
        if (affordsBuy(s, seat, CITIES[id].price, tier, cfg)) return { type: "buy" };
        return { type: "decline" };
      }
      if (s.pendingCompany !== null) {
        const ci = s.pendingCompany;
        const cost = COMPANIES[ci].buy;
        const partnerOwned = s.companies[COMPANIES[ci].partner] === seat;
        if (partnerOwned && p.cash - cost >= RESERVE_FLOOR) return { type: "buy" };       // complete the 5× pair
        if (!partnerOwned && companiesOwned(s, seat) === 0 && p.cash - cost >= cfg.reserve) return { type: "buy" }; // start a pair
        return { type: "decline" };
      }
      return { type: "decline" };
    }

    case "auction": {
      const a = s.auction;
      if (!a) return { type: "bid", amount: 0 };
      const worth = auctionWorth(s, seat, a.kind, a.index, cfg);
      const cap = Math.floor(worth * cfg.auctionCap);
      const canSpend = Math.floor(p.cash - RESERVE_FLOOR);
      const bid = Math.min(cap, canSpend);
      return { type: "bid", amount: bid > 0 ? bid : 0 };
    }

    case "manage": {
      const redeem = unmortgageTarget(s, seat, cfg.reserve);
      if (redeem !== null) return { type: "unmortgage", cityId: redeem };
      // Houses build down to the normal reserve (0 for an over-leverager); hotels are gated by
      // wantsHotels() and kept behind a deeper buffer so bots stop rushing hotels off one set.
      const houseReserve = cfg.overLeverage ? 0 : cfg.reserve;
      const hotelReserve = cfg.overLeverage ? cfg.reserve : cfg.reserve * 2;
      const target = developTarget(s, seat, houseReserve, hotelReserve, wantsHotels(s, cfg));
      return target !== null ? { type: "develop", cityId: target } : { type: "end_turn" };
    }

    default:
      return { type: "end_turn" };
  }
}

const EMPTY: Set<number> = new Set();
function zoneCities(zone: number): number[] {
  const out: number[] = [];
  for (let id = 0; id < CITIES.length; id++) if (CITIES[id].zone === zone) out.push(id);
  return out;
}
function zoneOwnedCount(s: GameState, seat: number, zone: number, lose: Set<number>, gain: Set<number>): number {
  let n = 0;
  for (const id of zoneCities(zone)) {
    const owns = (s.cities[id].owner === seat && !s.cities[id].mortgaged && !lose.has(id)) || gain.has(id);
    if (owns) n++;
  }
  return n;
}
function controlledSetCount(s: GameState, seat: number, lose: Set<number>, gain: Set<number>): number {
  let c = 0;
  for (let z = 0; z < 5; z++) if (zoneOwnedCount(s, seat, z, lose, gain) >= SET_OWN_NEEDED) c++;
  return c;
}
function bestZoneProgress(s: GameState, seat: number, lose: Set<number>, gain: Set<number>): number {
  let best = 0;
  for (let z = 0; z < 5; z++) best = Math.max(best, zoneOwnedCount(s, seat, z, lose, gain));
  return best;
}
function citiesValue(ids: number[] | undefined): number {
  return (ids ?? []).reduce((sum, id) => sum + (CITIES[id]?.price ?? 0), 0);
}

/** True if giving these cities to `to` would COMPLETE a set for them. */
function givingCompletesSet(s: GameState, to: number, giveIds: number[]): boolean {
  return controlledSetCount(s, to, EMPTY, new Set(giveIds)) > controlledSetCount(s, to, EMPTY, EMPTY);
}

// Whether a recipient bot accepts a trade. Cash trades always refused. Then, in order:
//  - the Turtle (no `trades`) refuses everything;
//  - COALITION: never hand a HUMAN the card that completes their set (bots gang the human) —
//    unless the bot completes a set of its own in the same swap;
//  - completes a NEW set for the bot → yes (unless a schemer being asked by the leader);
//  - breaks one of its OWN sets → no;
//  - otherwise set-neutral: normal-ish take a fair set-advancing swap; a land-grabber takes a
//    fair more-in-than-out swap. Cautious/base only ever completes a set.
export function botAcceptsTrade(
  s: GameState,
  t: TradeOffer,
  persona: BotPersona = "normal",
  leader = -1,
  humans: Set<number> = EMPTY,
): boolean {
  if ((t.give.cash || 0) !== 0 || (t.get.cash || 0) !== 0) return false;
  const cfg = PERSONA[persona];
  if (!cfg.trades) return false; // the Turtle never trades
  if (cfg.gangLeader && t.from === leader && t.from !== t.to) return false; // scheme against the leader

  const receive = new Set(t.give.cities ?? []); // bot (t.to) RECEIVES give.cities
  const giveAway = t.get.cities ?? [];          // bot GIVES get.cities (→ proposer t.from)
  const giveSet = new Set(giveAway);
  const before = controlledSetCount(s, t.to, EMPTY, EMPTY);
  const after = controlledSetCount(s, t.to, giveSet, receive);

  // Coalition + no-gift guard: refuse if handing the proposer their set-completer, unless the bot
  // completes its own set too. Enforced hard against humans; also the general holdMonopoly rule.
  const feedsProposer = givingCompletesSet(s, t.from, giveAway);
  if (feedsProposer && after <= before && (humans.has(t.from) || cfg.holdMonopoly)) return false;

  if (after > before) return true;   // completes a set for the bot
  if (after < before) return false;  // never break your own set
  if (persona === "cautious") return false;

  const fairValue = citiesValue(t.give.cities) >= citiesValue(t.get.cities); // receive ≥ give
  const advances = bestZoneProgress(s, t.to, giveSet, receive) > bestZoneProgress(s, t.to, EMPTY, EMPTY);
  if (advances && (fairValue || cfg.premiumTrades)) return true;
  if (cfg.valueUpTrade && fairValue && receive.size > giveAway.length) return true;
  return false;
}

// A single city `seat` can trade away without the engine rejecting it: owned, unmortgaged, and not
// part of a colour set that already carries houses (engine bad_give rule).
function tradeableCities(s: GameState, seat: number): number[] {
  const out: number[] = [];
  for (let id = 0; id < s.cities.length; id++) {
    const c = s.cities[id];
    if (c.owner === seat && !c.mortgaged && !setHasDevelopment(s, seat, CITIES[id].zone)) out.push(id);
  }
  return out;
}

// How much a swap (lose `giveIds`, gain `getId`) improves `seat`'s board.
function tradeGain(s: GameState, seat: number, giveIds: number[], getId: number, premium: boolean): number {
  const lose = new Set(giveIds);
  const gain = new Set([getId]);
  const setDelta = controlledSetCount(s, seat, lose, gain) - controlledSetCount(s, seat, EMPTY, EMPTY);
  if (setDelta < 0) return -Infinity;
  const progDelta = bestZoneProgress(s, seat, lose, gain) - bestZoneProgress(s, seat, EMPTY, EMPTY);
  const valueDelta = premium ? 0 : (CITIES[getId]?.price ?? 0) - citiesValue(giveIds);
  return setDelta * 1_000_000 + progDelta * 1_000 + valueDelta - giveIds.length * 10; // prefer fewer cards given
}

// The best trade a bot can PROPOSE now: search every 1-card or 2-card give for a card someone holds,
// keep those that improve its board AND that a rational recipient (`wouldAccept`) would take, and
// return the best by the bot's own gain. COALITION: bots never initiate a trade with a human
// (`humans`) — they cooperate only with each other. Null if nothing beats standing pat.
export function findBestBotTrade(
  s: GameState,
  seat: number,
  wouldAccept: (to: number, offer: TradeOffer) => boolean,
  persona: BotPersona = "normal",
  leader = -1,
  humans: Set<number> = EMPTY,
): { to: number; give: TradeOffer["give"]; get: TradeOffer["get"] } | null {
  const cfg = PERSONA[persona];
  if (!cfg.trades) return null; // the Turtle never proposes
  const mine = tradeableCities(s, seat);
  let best: { to: number; give: TradeOffer["give"]; get: TradeOffer["get"] } | null = null;
  let bestScore = 0; // strictly-positive gain required, so bots don't trade for no reason
  const consider = (to: number, giveIds: number[], getId: number): void => {
    // Don't hand a rival a set-completer unless I complete one too.
    if ((cfg.holdMonopoly || humans.has(to)) && givingCompletesSet(s, to, giveIds)
      && controlledSetCount(s, seat, new Set(giveIds), new Set([getId])) <= controlledSetCount(s, seat, EMPTY, EMPTY)) return;
    const gain = tradeGain(s, seat, giveIds, getId, cfg.premiumTrades);
    if (gain <= 0 || gain <= bestScore) return;
    const offer: TradeOffer = { id: 0, from: seat, to, give: { cash: 0, cities: giveIds }, get: { cash: 0, cities: [getId] }, expiresAt: 0 };
    if (!wouldAccept(to, offer)) return;
    best = { to, give: offer.give, get: offer.get };
    bestScore = gain;
  };
  for (let to = 0; to < s.players.length; to++) {
    if (to === seat || s.players[to].left) continue;
    if (humans.has(to)) continue;                  // coalition: bots don't initiate with the human
    if (cfg.gangLeader && to === leader) continue; // scheme against the leader
    for (const getId of tradeableCities(s, to)) {
      for (let i = 0; i < mine.length; i++) {
        consider(to, [mine[i]], getId);                                       // 1-for-1
        for (let j = i + 1; j < mine.length; j++) consider(to, [mine[i], mine[j]], getId); // 2-for-1
      }
    }
  }
  return best;
}

// Play out every consecutive bot turn from the current state, plus clear any rent a bot owes from a
// just-ended turn. Mutates `s` and returns the applied steps (replay-safe). `personaOf` resolves a
// seat's play style. `eventSink`, when passed, collects every engine event the bots produce.
//
// COALITION: any seat NOT in `botSeats` (and not left) is a human the bots quietly gang up on —
// they trade set-completers among themselves and never feed a human theirs. Fully automatic and
// hidden (no UI, no state flag); scales to however many bots are at the table.
export function driveBots(
  s: GameState,
  botSeats: Set<number>,
  personaOf: (seat: number) => BotPersona = () => "normal",
  eventSink?: EngineEvent[],
): { seat: number; intent: Intent }[] {
  const steps: { seat: number; intent: Intent }[] = [];
  const humans = new Set<number>();
  for (let i = 0; i < s.players.length; i++) if (!botSeats.has(i) && !s.players[i].left) humans.add(i);

  const apply = (seat: number, intent: Intent): void => {
    const r = applyIntent(s, seat, intent);
    if (!("error" in r)) { steps.push({ seat, intent }); if (eventSink) eventSink.push(...r.events); }
  };
  const offTurn = (): void => {
    for (const pay of [...(s.payments ?? [])]) if (botSeats.has(pay.actor)) apply(pay.actor, { type: "confirm_payment", paymentId: pay.id });
    if (s.ended) return;
    const leader = leaderSeat(s);
    for (const b of botSeats) {
      if (b === s.active) continue; // a bot only proposes on its off-turn
      if ((s.trades ?? []).some((t) => t.from === b)) continue; // one outgoing offer at a time
      const swap = findBestBotTrade(s, b, (to, offer) => botAcceptsTrade(s, offer, personaOf(to), leader, humans), personaOf(b), leader, humans);
      if (swap) apply(b, { type: "propose_trade", to: swap.to, give: swap.give, get: swap.get });
    }
    for (const t of [...(s.trades ?? [])]) if (botSeats.has(t.to)) apply(t.to, { type: "respond_trade", tradeId: t.id, accept: botAcceptsTrade(s, t, personaOf(t.to), leader, humans) });
  };

  let guard = 0;
  while (!s.ended && guard++ < 4000) {
    const seat = s.phase === "auction" && s.auction
      ? s.auction.bids.findIndex((b) => b === null)
      : s.active;
    if (seat < 0 || !botSeats.has(seat)) break; // a human must act here → hand control back
    const intent = botIntent(s, seat, personaOf(seat));
    const r = applyIntent(s, seat, intent);
    if ("error" in r) break; // policy should never emit an illegal move; stop rather than spin
    steps.push({ seat, intent });
    if (eventSink) eventSink.push(...r.events);
    offTurn();
  }
  offTurn();
  return steps;
}
