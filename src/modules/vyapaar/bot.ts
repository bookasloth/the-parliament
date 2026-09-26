import { CITIES, COMPANIES, MAX_LEVEL, HOTEL_LEVEL, SET_OWN_NEEDED, upgradeCost } from "./engine/data";
import { CITY_POS } from "./engine/board";
import { citiesOwned, controlsSet, companiesOwned, netWorth } from "./engine/helpers";
import { applyIntent, setHasDevelopment } from "./engine/engine";
import type { GameState, Intent, TradeOffer, EngineEvent } from "./engine/state";

// Computer players ("Vyapaari bots") so games can run without a full table of humans.
// Bots are backed by real, fixed User rows (userId is a required FK) seeded once via
// prisma/seeds/vyapaar-bots.sql — their ids are the constants below, so a seat is a bot
// iff its userId is in this set (no schema flag, no per-turn lookup).

// Each bot's board piece is a PNG on the same CDN as the human token pieces. Upload these
// filenames (see the list in the PR/notes); until they exist the <img> just shows a broken
// piece — the game is unaffected.
const TOK = "https://company-assets.bookasloth.in/nnawca/images/tokens";

// Play style. Drives how much cash a bot keeps in reserve, how hard it bids at auction,
// how widely it sprawls across zones, and how eagerly it accepts trades. Resolved from the
// (fixed) bot userId at drive time — deliberately NOT stored in game state, so it survives a
// replay/rebuild (which re-creates state from the stored log) without ever going stale.
export type BotPersona = "cautious" | "normal" | "aggressive";
interface PersonaCfg {
  reserve: number;   // cash kept in hand rather than spent to the last rupee
  bidFactor: number; // fraction of the base price a bot will bid at auction
  sprawl: boolean;   // buy toward any zone it's begun (true) vs. only until it owns one set's worth (false)
  valueUpTrade: boolean;  // accept a set-neutral trade that grows property value (land-grab)
  premiumTrades: boolean; // overpay in a swap to complete/advance a set (risk appetite)
  overLeverage: boolean;  // develop past a prudent reserve → deterministically runs short & misses rent
  gangLeader: boolean;    // refuse to trade with the current leader; scheme against them
  holdMonopoly: boolean;  // never hand a rival the card that completes their set
}
// All traits are DETERMINISTIC functions of persona + board state (no randomness) so matches stay
// replay/audit/resume-safe. "Mistakes" (missed payments) are emergent: an over-leveraging bot
// spends toward zero and genuinely can't cover the next rent.
const PERSONA: Record<BotPersona, PersonaCfg> = {
  cautious:   { reserve: 4000, bidFactor: 0.5,  sprawl: false, valueUpTrade: false, premiumTrades: false, overLeverage: false, gangLeader: false, holdMonopoly: false },
  normal:     { reserve: 2000, bidFactor: 0.6,  sprawl: false, valueUpTrade: false, premiumTrades: false, overLeverage: false, gangLeader: false, holdMonopoly: false },
  aggressive: { reserve: 500,  bidFactor: 0.85, sprawl: true,  valueUpTrade: true,  premiumTrades: true,  overLeverage: true,  gangLeader: true,  holdMonopoly: true },
};

// The seat currently ahead (highest net worth), or -1 if none — the target aggressive bots gang.
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
  { id: "00000000-0000-4000-8000-0000000000b1", username: "bot_abuddhi", name: "A Buddhi",       cash: 200000, token: `${TOK}/bot-abuddhi.png`, persona: "cautious"   as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b2", username: "bot_vflash",  name: "V Flash",        cash: 200000, token: `${TOK}/bot-vflash.png`,  persona: "aggressive" as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b3", username: "bot_dkboss",  name: "DK Boss",        cash: 100000, token: `${TOK}/bot-dkboss.png`,  persona: "aggressive" as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b4", username: "bot_chimlig", name: "Chimli G",       cash: 100000, token: `${TOK}/bot-chimlig.png`, persona: "normal"     as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b5", username: "bot_pkaddoo", name: "P Kaddoo",       cash: 150000, token: `${TOK}/bot-pkaddoo.png`, persona: "cautious"   as BotPersona },
  { id: "00000000-0000-4000-8000-0000000000b6", username: "bot_dhamma",  name: "Little Dhamma",  cash: 150000, token: `${TOK}/bot-dhamma.png`,  persona: "normal"     as BotPersona },
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

/** A bot's special board token (data-URI piece), or null for a non-bot. */
export function botToken(userId: string): string | null {
  return BOT_BY_ID.get(userId)?.token ?? null;
}

// Cheapest even-build target in a set the bot controls that it can afford right now, or null.
// Mirrors the engine's develop rules (even-build, hotels need you on the tile) so the chosen
// intent is never rejected.
function developTarget(s: GameState, seat: number, reserve: number): number | null {
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
      if (s.cities[id].level + 1 >= HOTEL_LEVEL && p.pos !== CITY_POS[id]) continue; // hotels need you here
      const cost = upgradeCost(id);
      if (p.cash - cost < reserve) continue;
      if (cost < bestCost) { best = id; bestCost = cost; }
    }
  }
  return best;
}

// The bot brain: one legal intent for `seat` given the current state. Pure + deterministic
// (so replaying the action log reproduces the game). Strategy follows the lean-monopoly math:
// pay what you owe, buy toward a SINGLE zone set (don't sprawl past 3), build hotels when you
// control a set, grab a company pair, sit out jail.
export function botIntent(s: GameState, seat: number, persona: BotPersona = "normal"): Intent {
  const p = s.players[seat];
  const cfg = PERSONA[persona];

  // 1. Always clear a debt you owe before anything else (dodging it = 2× or, for ED raids, jail).
  const owed = (s.payments ?? []).find((x) => x.actor === seat);
  if (owed) return { type: "confirm_payment", paymentId: owed.id };

  switch (s.phase) {
    case "roll":
      return { type: "roll" };

    case "jail":
      return { type: "serve_jail" }; // cheap + deterministic; never drains cash on a bribe

    case "buy": {
      if (s.pendingCity !== null) {
        const id = s.pendingCity;
        const zone = CITIES[id].zone;
        const owned = citiesOwned(s, seat);
        const inZone = owned.filter((c) => CITIES[c].zone === zone).length;
        // buy toward a set: progress a zone you're already in, or start one. Cautious/normal
        // stay disciplined (start a new zone only while below one set's worth of cities);
        // aggressive sprawls into any zone it hasn't yet completed.
        const useful = inZone < SET_OWN_NEEDED && (inZone > 0 || cfg.sprawl || owned.length < SET_OWN_NEEDED);
        if (useful && p.cash - CITIES[id].price >= cfg.reserve) return { type: "buy" };
        return { type: "decline" };
      }
      if (s.pendingCompany !== null) {
        const ci = s.pendingCompany;
        if (companiesOwned(s, seat) < 2 && p.cash - COMPANIES[ci].buy >= cfg.reserve) return { type: "buy" };
        return { type: "decline" };
      }
      return { type: "decline" };
    }

    case "auction": {
      const a = s.auction;
      if (!a) return { type: "bid", amount: 0 };
      const base = a.kind === "city" ? CITIES[a.index].price : COMPANIES[a.index].buy;
      const bid = Math.min(Math.floor(p.cash - cfg.reserve), Math.floor(base * cfg.bidFactor));
      return { type: "bid", amount: bid > 0 ? bid : 0 };
    }

    case "manage": {
      // Over-leveraging bots build past a prudent reserve, spending toward zero — deterministically
      // leaving themselves unable to cover the next rent (their "mistake" is greed, not a dice roll).
      const target = developTarget(s, seat, cfg.overLeverage ? 0 : cfg.reserve);
      return target !== null ? { type: "develop", cityId: target } : { type: "end_turn" };
    }

    default:
      return { type: "end_turn" }; // safety net for any unexpected phase
  }
}

const EMPTY: Set<number> = new Set();
function zoneCities(zone: number): number[] {
  const out: number[] = [];
  for (let id = 0; id < CITIES.length; id++) if (CITIES[id].zone === zone) out.push(id);
  return out;
}
// Unmortgaged cities `seat` owns in `zone`, with `lose` removed and `gain` added (for
// hypothetical post-swap counts).
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
// The deepest a seat has progressed toward ANY single set (its fullest zone). Used to reward
// swaps that move a bot closer to a set even when they don't complete one this turn.
function bestZoneProgress(s: GameState, seat: number, lose: Set<number>, gain: Set<number>): number {
  let best = 0;
  for (let z = 0; z < 5; z++) best = Math.max(best, zoneOwnedCount(s, seat, z, lose, gain));
  return best;
}
// Total face value (city prices) of a set of city ids.
function citiesValue(ids: number[] | undefined): number {
  return (ids ?? []).reduce((sum, id) => sum + (CITIES[id]?.price ?? 0), 0);
}

// Whether a recipient bot accepts a trade. Cash trades are always refused (cash is never part
// of a player trade). Then, in order:
//  - completes a NEW set → yes, every persona;
//  - breaks one of its OWN sets → no, every persona;
//  - otherwise (set-neutral): normal/aggressive take it when it moves them CLOSER to a set and
//    the cities they receive are worth at least what they give (a fair set-building swap);
//    aggressive additionally takes any fair land-grab (more cities in than out). Cautious only
//    ever trades to complete a set.
export function botAcceptsTrade(s: GameState, t: TradeOffer, persona: BotPersona = "normal", leader = -1): boolean {
  if ((t.give.cash || 0) !== 0 || (t.get.cash || 0) !== 0) return false;
  const cfg = PERSONA[persona];
  // Coalition: a schemer refuses to trade with the current leader at all — starve them of help.
  if (cfg.gangLeader && t.from === leader && t.from !== t.to) return false;
  const receive = new Set(t.give.cities ?? []); // to RECEIVES give.cities
  const giveAway = new Set(t.get.cities ?? []); // to GIVES get.cities
  const before = controlledSetCount(s, t.to, EMPTY, EMPTY);
  const after = controlledSetCount(s, t.to, giveAway, receive);
  if (after > before) return true;   // completes a set
  if (after < before) return false;  // never break your own set
  if (persona === "cautious") return false;

  const fairValue = citiesValue(t.give.cities) >= citiesValue(t.get.cities); // receive ≥ give
  const advances = bestZoneProgress(s, t.to, giveAway, receive) > bestZoneProgress(s, t.to, EMPTY, EMPTY);
  // Normal needs a fair swap; a risk-taker (premiumTrades) will overpay to keep building.
  if (advances && (fairValue || cfg.premiumTrades)) return true;
  // Land-grab: grab more cities than it gives, as long as the value is fair.
  if (cfg.valueUpTrade && fairValue && receive.size > giveAway.size) return true;
  return false;
}

// A single city `seat` can trade away without the engine rejecting it: owned, unmortgaged, and
// not part of a colour set that already carries houses (engine bad_give rule).
function tradeableCities(s: GameState, seat: number): number[] {
  const out: number[] = [];
  for (let id = 0; id < s.cities.length; id++) {
    const c = s.cities[id];
    if (c.owner === seat && !c.mortgaged && !setHasDevelopment(s, seat, CITIES[id].zone)) out.push(id);
  }
  return out;
}

// How much a one-for-one swap (lose `giveId`, gain `getId`) improves `seat`'s board: completing
// a set is worth far more than nudging progress, and losing a set is disqualifying (−∞). A
// value-disciplined bot also weighs the price paid (so it gives up its cheapest useful card); a
// risk-taker (`premium`) ignores price and will overpay to complete or advance a set.
function tradeGain(s: GameState, seat: number, giveId: number, getId: number, premium: boolean): number {
  const lose = new Set([giveId]);
  const gain = new Set([getId]);
  const setDelta = controlledSetCount(s, seat, lose, gain) - controlledSetCount(s, seat, EMPTY, EMPTY);
  if (setDelta < 0) return -Infinity; // never break your own set
  const progDelta = bestZoneProgress(s, seat, lose, gain) - bestZoneProgress(s, seat, EMPTY, EMPTY);
  const valueDelta = premium ? 0 : (CITIES[getId]?.price ?? 0) - (CITIES[giveId]?.price ?? 0);
  return setDelta * 1_000_000 + progDelta * 1_000 + valueDelta;
}

// True if handing `getId`… no — if giving `giveId` to `to` would COMPLETE a set for them.
function givingCompletesRivalSet(s: GameState, to: number, giveId: number): boolean {
  return controlledSetCount(s, to, EMPTY, new Set([giveId])) > controlledSetCount(s, to, EMPTY, EMPTY);
}

// The best trade a bot can PROPOSE right now, to any other player (bot or human): search every
// one-for-one swap of a card it can spare for a card someone else holds, keep those that improve
// its own board AND that a rational recipient (`wouldAccept`) would take, and return the single
// best by the bot's own gain. This is what makes bots trade proactively and re-trade cards they
// picked up earlier — the search runs over their current holdings every turn. Null if nothing
// beats standing pat.
export function findBestBotTrade(
  s: GameState,
  seat: number,
  wouldAccept: (to: number, offer: TradeOffer) => boolean,
  persona: BotPersona = "normal",
  leader = -1,
): { to: number; give: TradeOffer["give"]; get: TradeOffer["get"] } | null {
  const cfg = PERSONA[persona];
  const mine = tradeableCities(s, seat);
  let best: { to: number; give: TradeOffer["give"]; get: TradeOffer["get"] } | null = null;
  let bestScore = 0; // strictly-positive gain required, so bots don't trade for no reason
  for (const to of s.players.map((_, i) => i)) {
    if (to === seat || s.players[to].left) continue;
    if (cfg.gangLeader && to === leader) continue; // coalition: never deal with the leader
    const theirs = tradeableCities(s, to);
    for (const getId of theirs) {
      for (const giveId of mine) {
        // Monopoly holder: don't hand a rival the card that completes their set (unless I complete
        // one too — a genuine mutual swap).
        if (cfg.holdMonopoly && givingCompletesRivalSet(s, to, giveId)
          && controlledSetCount(s, seat, new Set([giveId]), new Set([getId])) <= controlledSetCount(s, seat, EMPTY, EMPTY)) continue;
        const gain = tradeGain(s, seat, giveId, getId, cfg.premiumTrades);
        if (gain <= 0 || gain <= bestScore) continue;
        const offer: TradeOffer = { id: 0, from: seat, to, give: { cash: 0, cities: [giveId] }, get: { cash: 0, cities: [getId] }, expiresAt: 0 };
        if (!wouldAccept(to, offer)) continue; // only offer trades the other side would take
        best = { to, give: offer.give, get: offer.get };
        bestScore = gain;
      }
    }
  }
  return best;
}

// Play out every consecutive bot turn from the current state, plus clear any rent a bot owes
// from a just-ended turn (so it settles once instead of expiring into a double charge). Mutates
// `s` and returns the applied steps to append to the match action log (replay-safe). The guard
// caps a runaway loop far above any real game length (a 40-round table is a few hundred steps).
// `personaOf` resolves a seat's play style (default: everyone normal — keeps tests + any
// non-persona caller unchanged). `eventSink`, when passed, collects every engine event the
// bots produce during the burst, in order, so the client can replay a play-by-play of what
// the bots just did instead of the board silently teleporting to the final state.
export function driveBots(
  s: GameState,
  botSeats: Set<number>,
  personaOf: (seat: number) => BotPersona = () => "normal",
  eventSink?: EngineEvent[],
): { seat: number; intent: Intent }[] {
  const steps: { seat: number; intent: Intent }[] = [];
  const apply = (seat: number, intent: Intent): void => {
    const r = applyIntent(s, seat, intent);
    if (!("error" in r)) { steps.push({ seat, intent }); if (eventSink) eventSink.push(...r.events); }
  };
  // Off-turn housekeeping run BETWEEN turns (not just at the end): clear bot debts, then let
  // bots trade among themselves — propose mutual set-completing swaps and answer any offer.
  const offTurn = (): void => {
    for (const pay of [...(s.payments ?? [])]) if (botSeats.has(pay.actor)) apply(pay.actor, { type: "confirm_payment", paymentId: pay.id });
    if (s.ended) return;
    const leader = leaderSeat(s); // recomputed each pass — the target coalitions gang up on
    for (const b of botSeats) {
      if (b === s.active) continue; // bot policy: a bot only proposes on its off-turn (engine now allows either)
      if ((s.trades ?? []).some((t) => t.from === b)) continue; // one outgoing offer at a time
      const swap = findBestBotTrade(s, b, (to, offer) => botAcceptsTrade(s, offer, personaOf(to), leader), personaOf(b), leader);
      if (swap) apply(b, { type: "propose_trade", to: swap.to, give: swap.give, get: swap.get });
    }
    for (const t of [...(s.trades ?? [])]) if (botSeats.has(t.to)) apply(t.to, { type: "respond_trade", tradeId: t.id, accept: botAcceptsTrade(s, t, personaOf(t.to), leader) });
  };

  let guard = 0;
  while (!s.ended && guard++ < 4000) {
    // In an auction the actor is the first seat that hasn't bid (not necessarily s.active);
    // every other phase is driven by the active seat.
    const seat = s.phase === "auction" && s.auction
      ? s.auction.bids.findIndex((b) => b === null)
      : s.active;
    if (seat < 0 || !botSeats.has(seat)) break; // a human must act here → hand control back
    const intent = botIntent(s, seat, personaOf(seat));
    const r = applyIntent(s, seat, intent);
    if ("error" in r) break; // policy should never emit an illegal move; stop rather than spin
    steps.push({ seat, intent });
    if (eventSink) eventSink.push(...r.events);
    offTurn(); // settle debts + trade between each turn
  }
  offTurn(); // final pass (e.g. answer a human's just-proposed trade once control returns)
  return steps;
}
