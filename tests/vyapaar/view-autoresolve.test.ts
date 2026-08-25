import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, autoResolve, nextAutoIntent } from "@/modules/vyapaar/engine/engine";
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
    s.cities[0].owner = 0;
    applyIntent(s, 0, { type: "propose_trade", to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [] } });
    expect((publicView(s, 0) as unknown as Record<string, unknown>).trade).not.toBeNull();
    expect((publicView(s, 1) as unknown as Record<string, unknown>).trade).not.toBeNull();
    expect((publicView(s, 2) as unknown as Record<string, unknown>).trade).toBeNull();
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
    s.auction = { cityId: 0, bids: [null, null] };
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "bid", amount: 0 } });
    s.auction.bids[0] = 0;
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
