import { CITIES, COMPANIES, MAX_LEVEL, HOTEL_LEVEL, SET_OWN_NEEDED, upgradeCost } from "./engine/data";
import { CITY_POS } from "./engine/board";
import { citiesOwned, controlsSet, companiesOwned } from "./engine/helpers";
import { applyIntent } from "./engine/engine";
import type { GameState, Intent } from "./engine/state";

// Computer players ("Vyapaari bots") so games can run without a full table of humans.
// Bots are backed by real, fixed User rows (userId is a required FK) seeded once via
// prisma/seeds/vyapaar-bots.sql — their ids are the constants below, so a seat is a bot
// iff its userId is in this set (no schema flag, no per-turn lookup).

export const BOT_USERS = [
  { id: "00000000-0000-4000-8000-0000000000b1", username: "bot_ravi", name: "Ravi (bot)" },
  { id: "00000000-0000-4000-8000-0000000000b2", username: "bot_meera", name: "Meera (bot)" },
  { id: "00000000-0000-4000-8000-0000000000b3", username: "bot_arjun", name: "Arjun (bot)" },
  { id: "00000000-0000-4000-8000-0000000000b4", username: "bot_sana", name: "Sana (bot)" },
  { id: "00000000-0000-4000-8000-0000000000b5", username: "bot_dev", name: "Dev (bot)" },
] as const;
const BOT_IDS = new Set<string>(BOT_USERS.map((b) => b.id));

export function isBotUserId(userId: string): boolean {
  return BOT_IDS.has(userId);
}

export const BOT_OPENING_CASH = 25000; // fixed stack; bots never settle to a real wallet

const RESERVE = 2000; // cash a bot keeps in hand rather than spending to the last rupee

// Cheapest even-build target in a set the bot controls that it can afford right now, or null.
// Mirrors the engine's develop rules (even-build, hotels need you on the tile) so the chosen
// intent is never rejected.
function developTarget(s: GameState, seat: number): number | null {
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
      if (p.cash - cost < RESERVE) continue;
      if (cost < bestCost) { best = id; bestCost = cost; }
    }
  }
  return best;
}

// The bot brain: one legal intent for `seat` given the current state. Pure + deterministic
// (so replaying the action log reproduces the game). Strategy follows the lean-monopoly math:
// pay what you owe, buy toward a SINGLE zone set (don't sprawl past 3), build hotels when you
// control a set, grab a company pair, sit out jail.
export function botIntent(s: GameState, seat: number): Intent {
  const p = s.players[seat];

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
        // buy only toward one set: progress a zone you're already in, or start a zone while
        // you still own fewer than a full set (keeps the ≤3-cities scrappy bonus in reach)
        const useful = inZone < SET_OWN_NEEDED && (inZone > 0 || owned.length < SET_OWN_NEEDED);
        if (useful && p.cash - CITIES[id].price >= RESERVE) return { type: "buy" };
        return { type: "decline" };
      }
      if (s.pendingCompany !== null) {
        const ci = s.pendingCompany;
        if (companiesOwned(s, seat) < 2 && p.cash - COMPANIES[ci].buy >= RESERVE) return { type: "buy" };
        return { type: "decline" };
      }
      return { type: "decline" };
    }

    case "auction": {
      const a = s.auction;
      if (!a) return { type: "bid", amount: 0 };
      const base = a.kind === "city" ? CITIES[a.index].price : COMPANIES[a.index].buy;
      const bid = Math.min(Math.floor(p.cash - RESERVE), Math.floor(base * 0.6));
      return { type: "bid", amount: bid > 0 ? bid : 0 };
    }

    case "manage": {
      const target = developTarget(s, seat);
      return target !== null ? { type: "develop", cityId: target } : { type: "end_turn" };
    }

    default:
      return { type: "end_turn" }; // safety net for any unexpected phase
  }
}

// Play out every consecutive bot turn from the current state, plus clear any rent a bot owes
// from a just-ended turn (so it settles once instead of expiring into a double charge). Mutates
// `s` and returns the applied steps to append to the match action log (replay-safe). The guard
// caps a runaway loop far above any real game length (a 40-round table is a few hundred steps).
export function driveBots(s: GameState, botSeats: Set<number>): { seat: number; intent: Intent }[] {
  const steps: { seat: number; intent: Intent }[] = [];
  let guard = 0;
  while (!s.ended && guard++ < 3000) {
    // In an auction the actor is the first seat that hasn't bid (not necessarily s.active);
    // every other phase is driven by the active seat.
    const seat = s.phase === "auction" && s.auction
      ? s.auction.bids.findIndex((b) => b === null)
      : s.active;
    if (seat < 0 || !botSeats.has(seat)) break; // a human must act here → hand control back
    const intent = botIntent(s, seat);
    const r = applyIntent(s, seat, intent);
    if ("error" in r) break; // policy should never emit an illegal move; stop rather than spin
    steps.push({ seat, intent });
  }
  for (const pay of [...(s.payments ?? [])]) {
    if (!botSeats.has(pay.actor)) continue;
    const intent: Intent = { type: "confirm_payment", paymentId: pay.id };
    const r = applyIntent(s, pay.actor, intent);
    if (!("error" in r)) steps.push({ seat: pay.actor, intent });
  }
  return steps;
}
