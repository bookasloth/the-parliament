import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import type { GameState, Intent } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { replay } from "@/modules/vyapaar/engine/replay";
import { nextRng } from "@/modules/vyapaar/engine/rng";
import { CITIES, COMPANIES } from "@/modules/vyapaar/engine/data";

function total(s: GameState): number {
  return s.players.reduce((n, p) => n + p.cash, 0);
}

// Events whose step may mint or burn cash (bank in/out) — everything else must
// conserve total cash. `event` covers the Indian-business cells (tax_return mints,
// ed_raid burns; married/festival/jnv are player→player and merely tolerated here).
const MINT_BURN = new Set([
  "salary",
  "event",
  "mandi",
  "develop",
  "mortgage",
  "unmortgage",
  "buy",
  "buy_company",
  "auction_won",
  "forced_sale",
  "forced_mortgage",
]);

/**
 * Deterministic (pure function of state) driver policy: buy whenever affordable so ownership,
 * rent, and forced liquidation actually occur — instead of always declining / always bidding 0.
 */
function pickIntent(s: GameState): { seat: number; intent: Intent } {
  if (s.phase === "roll") return { seat: s.active, intent: { type: "roll" } };
  if (s.phase === "buy") {
    const seat = s.active;
    const afford =
      s.pendingCity !== null
        ? s.players[seat].cash >= CITIES[s.pendingCity].price
        : s.pendingCompany !== null
          ? s.players[seat].cash >= COMPANIES[s.pendingCompany].buy
          : false;
    return { seat, intent: afford ? { type: "buy" } : { type: "decline" } };
  }
  if (s.phase === "auction") {
    const seat = s.auction!.bids.findIndex((b) => b === null);
    return { seat, intent: { type: "bid", amount: 0 } };
  }
  return { seat: s.active, intent: { type: "end_turn" } };
}

describe("determinism + money conservation", () => {
  it("replays a full auto-played game to the identical final state", () => {
    const names = ["a", "b", "c", "d"];
    const log: { seat: number; intent: Intent }[] = [];

    // Drive a full game with the buy-capable stepper, recording each successful intent.
    const s = createGame(2026, names, 25000);
    let guard = 0;
    while (!s.ended && guard++ < 5000) {
      const { seat, intent } = pickIntent(s);
      const before = JSON.stringify(s);
      const r = applyIntent(s, seat, intent);
      if ("state" in r) log.push({ seat, intent });
      else if (before !== JSON.stringify(s)) throw new Error("errored intent mutated state");
    }
    expect(s.ended).toBe(true);

    // Replaying the recorded log from the same seed reproduces the final state exactly.
    const s2 = replay(2026, names, log, 25000);
    expect(JSON.stringify(s2)).toBe(JSON.stringify(s));
  });

  it("conserves cash+pot except on explicit mint/burn steps (fuzz)", () => {
    const rngHolder = { rng: 4242 };
    let rentEvents = 0;
    let liquidationEvents = 0;
    for (let game = 0; game < 20; game++) {
      const n = 2 + Math.floor(nextRng(rngHolder) * 5); // 2..6
      const names = Array.from({ length: n }, (_, i) => `p${i}`);
      // Low opening stack so rent bites and forced liquidation actually fires.
      const s = createGame(1000 + game, names, 1500);
      let guard = 0;
      while (!s.ended && guard++ < 3000) {
        const { seat, intent } = pickIntent(s);
        const before = total(s);
        const r = applyIntent(s, seat, intent);
        const events = "events" in r ? r.events : [];
        for (const e of events) {
          if (e.type === "rent" || e.type === "company_fee") rentEvents++;
          if (e.type === "forced_sale" || e.type === "forced_mortgage") liquidationEvents++;
        }
        const touchedBank = events.some((e) => MINT_BURN.has(e.type));
        if (!touchedBank) {
          expect(total(s)).toBe(before); // pure transfer step conserves the total
        }
      }
    }
    // Non-vacuous by construction: the fuzz must actually exercise ownership/rent and the
    // forced-liquidation mint path, not just roll/decline/bid-0 no-ops.
    expect(rentEvents).toBeGreaterThan(0);
    expect(liquidationEvents).toBeGreaterThan(0);
  });
});
