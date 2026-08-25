import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, nextAutoIntent } from "@/modules/vyapaar/engine/engine";
import type { GameState } from "@/modules/vyapaar/engine/state";

// The prod auto-resolve loop (match.ts) is just nextAutoIntent → applyIntent per step.
const autoResolve = (s: GameState) => {
  const step = nextAutoIntent(s);
  if (step) applyIntent(s, step.seat, step.intent);
};
import { publicView } from "@/modules/vyapaar/engine/view";

describe("publicView", () => {
  it("never leaks rng, seed, or deck order", () => {
    const s = createGame(123, ["a", "b"]);
    const v = publicView(s, 0) as unknown as Record<string, unknown>;
    expect(v.rng).toBeUndefined();
    expect(v.seed).toBeUndefined();
    expect(v.headlineDeck).toBeUndefined();
    expect(v.upiDeck).toBeUndefined();
    expect(typeof v.headlineLeft).toBe("number");
  });

  it("shows a pending trade only to the two parties", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.active = 0; // seat 1 may propose (not its turn)
    s.cities[0].owner = 1;
    s.cities[6].owner = 2;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [6] } });
    const trades = (v: number) => (publicView(s, v) as unknown as { trades: unknown[] }).trades;
    expect(trades(1)).toHaveLength(1); // proposer
    expect(trades(2)).toHaveLength(1); // recipient
    expect(trades(0)).toHaveLength(0); // uninvolved party sees nothing
  });
});

describe("nextAutoIntent", () => {
  it("picks the minimal-legal step per phase", () => {
    const s = createGame(1, ["a", "b"]);
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "roll" } });
    s.phase = "buy";
    s.pendingCity = 0;
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "decline" } });
    s.phase = "manage";
    s.pendingCity = null;
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "end_turn" } });
  });
  it("bids 0 for the first un-bid seat during an auction", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "auction";
    s.auction = { kind: "city", index: 0, bids: [null, null] };
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "bid", amount: 0 } });
    s.auction!.bids[0] = 0;
    expect(nextAutoIntent(s)).toEqual({ seat: 1, intent: { type: "bid", amount: 0 } });
  });
  it("returns null when the game is over", () => {
    const s = createGame(1, ["a", "b"]);
    s.ended = true;
    expect(nextAutoIntent(s)).toBeNull();
  });
});

describe("autoResolve", () => {
  it("drives a stuck turn forward and eventually changes the active seat", () => {
    const s = createGame(9, ["a", "b"]);
    const startActive = s.active;
    let guard = 0;
    while (s.active === startActive && !s.ended && guard++ < 50) {
      autoResolve(s);
    }
    expect(s.active === startActive ? s.ended : true).toBe(true);
  });

  it("declines a buy when timed out", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "buy";
    s.pendingCity = 0;
    autoResolve(s);
    expect(s.cities[0].owner).toBeNull(); // declined → auction with all-zero later
  });
});
