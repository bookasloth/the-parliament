import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, rankSeats, winnerOf } from "@/modules/vyapaar/engine/engine";
import { cityLeaveValue } from "@/modules/vyapaar/engine/helpers";
import { CITIES, COMPANIES, upgradeCost } from "@/modules/vyapaar/engine/data";

const side = (cities: number[]) => ({ cash: 0, cities });

describe("player leaving", () => {
  it("refunds the leaver's FULL cost basis (price + full build cost + full company buy)", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.cities[0].owner = 1; s.cities[0].level = 2;
    s.cities[5].owner = 1; s.cities[5].mortgaged = true; // mortgaged → price minus the loan taken
    s.companies[2] = 1;
    const before = s.players[1].cash;
    const expected = cityLeaveValue(s, 0) + cityLeaveValue(s, 5) + COMPANIES[2].buy;
    // Full value, not the half-price sell penalty: unmortgaged city refunds full price + full build cost.
    expect(cityLeaveValue(s, 0)).toBe(CITIES[0].price + 2 * upgradeCost(0));
    expect(COMPANIES[2].buy).toBeGreaterThan(0);
    const r = applyIntent(s, 1, { type: "leave_game" });
    expect(s.players[1].cash).toBe(before + expected);
    const left = ("events" in r ? r.events : []).find((e) => e.type === "left");
    expect(left?.amount).toBe(expected);
  });

  it("returns all cities and companies to the bank and marks the player left", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.cities[0].owner = 1; s.cities[0].level = 3;
    s.cities[5].owner = 1; s.cities[5].mortgaged = true;
    s.companies[2] = 1;
    applyIntent(s, 1, { type: "leave_game" });
    expect(s.players[1].left).toBe(true);
    expect(s.cities[0].owner).toBeNull();
    expect(s.cities[0].level).toBe(0);
    expect(s.cities[5].owner).toBeNull();
    expect(s.cities[5].mortgaged).toBe(false);
    expect(s.companies[2]).toBeNull();
  });

  it("cancels every trade the leaver is part of (both directions)", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.active = 0;
    s.cities[0].owner = 1; s.cities[6].owner = 2; s.cities[10].owner = 0; s.cities[11].owner = 1;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) }); // leaver is `from`
    applyIntent(s, 2, { type: "propose_trade", to: 1, give: side([6]), get: side([11]) }); // leaver is `to`
    expect(s.trades).toHaveLength(2);
    applyIntent(s, 1, { type: "leave_game" });
    expect(s.trades).toHaveLength(0);
  });

  it("voids auto-payments the leaver owes or is owed", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.payments = [
      { id: 1, actor: 1, dir: "pay", amount: 300, party: 2, reason: "rent", expiresAt: 0 }, // leaver owes
      { id: 2, actor: 2, dir: "pay", amount: 200, party: 1, reason: "rent", expiresAt: 0 }, // leaver is owed
      { id: 3, actor: 0, dir: "pay", amount: 100, party: 2, reason: "rent", expiresAt: 0 }, // unrelated
    ];
    const cash0 = s.players[0].cash, cash2 = s.players[2].cash;
    applyIntent(s, 1, { type: "leave_game" });
    expect((s.payments ?? []).map((p) => p.id)).toEqual([3]); // only the unrelated one survives
    expect(s.players[0].cash).toBe(cash0); // nothing was charged/paid
    expect(s.players[2].cash).toBe(cash2);
  });

  it("advances the turn if the active player leaves — no stuck turn — and skips them thereafter", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.active = 1;
    s.phase = "roll";
    applyIntent(s, 1, { type: "leave_game" });
    expect(s.active).toBe(2); // moved off the leaver
    // seat 2 ends its turn → should wrap to seat 0, skipping the left seat 1
    s.phase = "manage";
    applyIntent(s, 2, { type: "end_turn" });
    expect(s.active).toBe(0);
  });

  it("ends the game when only one player remains, and the leaver can never win", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 999999; // seat 0 is far richer...
    applyIntent(s, 0, { type: "leave_game" }); // ...but leaves
    expect(s.ended).toBe(true);
    expect(winnerOf(s)).toBe(1); // the remaining player wins despite lower cash
    expect(rankSeats(s)[rankSeats(s).length - 1]).toBe(0); // leaver ranked last
  });

  it("a player who left cannot act", () => {
    const s = createGame(1, ["a", "b", "c"]);
    applyIntent(s, 1, { type: "leave_game" });
    const r = applyIntent(s, 1, { type: "roll" });
    expect("error" in r).toBe(true);
    // a second leave is also a no-op error (idempotent)
    expect("error" in applyIntent(s, 1, { type: "leave_game" })).toBe(true);
  });

  it("passes the leaver's outstanding auction bid so the auction can still resolve", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.active = 0;
    s.phase = "auction";
    s.auction = { kind: "city", index: 0, bids: [500, null, null] }; // seat 0 bid, 1 and 2 pending
    applyIntent(s, 1, { type: "bid", amount: 0 }); // seat 1 passes
    applyIntent(s, 2, { type: "leave_game" }); // seat 2 leaves with a pending bid
    expect(s.auction).toBeNull(); // auction resolved
    expect(s.cities[0].owner).toBe(0); // seat 0 won at 500
  });
});
