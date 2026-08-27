import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";

// Helper: a 3-player game where seat 0 is active, so seats 1 and 2 may propose
// (proposing is only legal on someone else's turn).
function game() {
  const s = createGame(1, ["a", "b", "c"]);
  s.active = 0;
  return s;
}
const side = (cities: number[]) => ({ cash: 0, cities });

describe("card-to-card trading", () => {
  it("swaps cities on accept, moves NO cash, supports multiple cities per side", () => {
    const s = game();
    s.cities[0].owner = 1; // Delhi
    s.cities[1].owner = 1; // Chandigarh
    s.cities[6].owner = 2; // Hyderabad
    const cash1 = s.players[1].cash, cash2 = s.players[2].cash;
    const r = applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0, 1]), get: side([6]) });
    expect("state" in r).toBe(true);
    expect(s.trades).toHaveLength(1);
    const id = s.trades[0].id;
    applyIntent(s, 2, { type: "respond_trade", tradeId: id, accept: true });
    expect(s.cities[0].owner).toBe(2);
    expect(s.cities[1].owner).toBe(2);
    expect(s.cities[6].owner).toBe(1);
    // No cash is part of the SWAP, but each trader pays the trader's-union charge (500 bank +
    // 500 split among the other players). With one other player here that's 1000 each. See
    // trade-charge.test.ts for the full charge coverage.
    expect(s.players[1].cash).toBe(cash1 - 1000);
    expect(s.players[2].cash).toBe(cash2 - 1000);
    expect(s.trades).toHaveLength(0);
  });

  it("rejects any cash in a trade", () => {
    const s = game();
    s.cities[0].owner = 1;
    s.cities[6].owner = 2;
    const r = applyIntent(s, 1, { type: "propose_trade", to: 2, give: { cash: 100, cities: [0] }, get: side([6]) });
    expect("error" in r).toBe(true);
  });

  it("rejects an empty side (card(s) ↔ card(s) — both sides must have a city)", () => {
    const s = game();
    s.cities[0].owner = 1;
    const r = applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([]) });
    expect("error" in r).toBe(true);
  });

  it("forbids proposing on your own turn", () => {
    const s = game();
    s.cities[0].owner = 0; // active seat 0 tries to propose
    s.cities[6].owner = 1;
    const r = applyIntent(s, 0, { type: "propose_trade", to: 1, give: side([0]), get: side([6]) });
    expect("error" in r).toBe(true);
  });

  it("allows only one outgoing trade per proposer", () => {
    const s = game();
    s.cities[0].owner = 1;
    s.cities[1].owner = 1;
    s.cities[6].owner = 2;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) });
    const r = applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([1]), get: side([6]) });
    expect("error" in r).toBe(true);
    expect(s.trades).toHaveLength(1);
  });

  it("lets two different proposers each hold an outgoing trade at once", () => {
    const s = game();
    s.cities[0].owner = 1;
    s.cities[6].owner = 2;
    s.cities[10].owner = 2; // Kolkata for seat 2 to offer
    s.cities[11].owner = 0;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) });
    applyIntent(s, 2, { type: "propose_trade", to: 0, give: side([10]), get: side([11]) });
    expect(s.trades).toHaveLength(2);
  });

  it("only the recipient may respond", () => {
    const s = game();
    s.cities[0].owner = 1;
    s.cities[6].owner = 2;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) });
    const id = s.trades[0].id;
    const r = applyIntent(s, 0, { type: "respond_trade", tradeId: id, accept: true });
    expect("error" in r).toBe(true);
    expect(s.trades).toHaveLength(1);
  });

  it("decline removes the offer without moving anything", () => {
    const s = game();
    s.cities[0].owner = 1;
    s.cities[6].owner = 2;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) });
    const id = s.trades[0].id;
    applyIntent(s, 2, { type: "respond_trade", tradeId: id, accept: false });
    expect(s.trades).toHaveLength(0);
    expect(s.cities[0].owner).toBe(1);
  });

  it("proposer can withdraw; a non-proposer cannot", () => {
    const s = game();
    s.cities[0].owner = 1;
    s.cities[6].owner = 2;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) });
    const id = s.trades[0].id;
    expect("error" in applyIntent(s, 2, { type: "withdraw_trade", tradeId: id })).toBe(true);
    expect("state" in applyIntent(s, 1, { type: "withdraw_trade", tradeId: id })).toBe(true);
    expect(s.trades).toHaveLength(0);
  });

  it("counter replaces the incoming offer with a reverse one back to the proposer", () => {
    const s = game();
    s.cities[0].owner = 1; // seat 1 offers Delhi
    s.cities[6].owner = 2; // wants Hyderabad from seat 2
    s.cities[10].owner = 2; // seat 2 will counter-offer Kolkata instead
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) });
    const id = s.trades[0].id;
    const r = applyIntent(s, 2, { type: "counter_trade", tradeId: id, give: side([10]), get: side([0]) });
    expect("state" in r).toBe(true);
    expect(s.trades).toHaveLength(1);
    const counter = s.trades[0];
    expect(counter.from).toBe(2);
    expect(counter.to).toBe(1);
    // original proposer (seat 1) can now accept, receiving Kolkata for Delhi
    applyIntent(s, 1, { type: "respond_trade", tradeId: counter.id, accept: true });
    expect(s.cities[10].owner).toBe(1);
    expect(s.cities[0].owner).toBe(2);
  });

  it("re-validates on accept — a city sold since the proposal makes the trade invalid", () => {
    const s = game();
    s.cities[0].owner = 1;
    s.cities[6].owner = 2;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) });
    const id = s.trades[0].id;
    s.cities[0].owner = null; // seat 1 no longer owns Delhi
    const r = applyIntent(s, 2, { type: "respond_trade", tradeId: id, accept: true });
    expect("error" in r).toBe(true);
    expect(s.trades).toHaveLength(0); // stale offer cleared
    expect(s.cities[6].owner).toBe(2); // nothing moved
  });

  it("rejects developed or mortgaged cities", () => {
    const s = game();
    s.cities[0].owner = 1; s.cities[0].level = 1;
    s.cities[6].owner = 2;
    expect("error" in applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) })).toBe(true);
    s.cities[0].level = 0; s.cities[0].mortgaged = true;
    expect("error" in applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) })).toBe(true);
  });

  it("expire_trade removes an offer (system-only expiry path)", () => {
    const s = game();
    s.cities[0].owner = 1;
    s.cities[6].owner = 2;
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) });
    const id = s.trades[0].id;
    applyIntent(s, 1, { type: "expire_trade", tradeId: id });
    expect(s.trades).toHaveLength(0);
    expect(s.cities[0].owner).toBe(1); // nothing swapped
  });
});

describe("trading companies", () => {
  it("swaps companies (and mixes with cities) on accept", () => {
    const s = game();
    s.cities[0].owner = 1; // seat 1 gives Delhi
    s.companies[0] = 1;    // ...and company 0
    s.companies[3] = 2;    // seat 2 gives company 3
    applyIntent(s, 1, {
      type: "propose_trade", to: 2,
      give: { cash: 0, cities: [0], companies: [0] },
      get: { cash: 0, cities: [], companies: [3] },
    });
    const id = s.trades![0].id;
    applyIntent(s, 2, { type: "respond_trade", tradeId: id, accept: true });
    expect(s.cities[0].owner).toBe(2);
    expect(s.companies[0]).toBe(2);
    expect(s.companies[3]).toBe(1);
  });

  it("rejects a company you don't own (bad_give) and an empty side", () => {
    const s = game();
    s.companies[0] = 2; // owned by someone else
    const r1 = applyIntent(s, 1, {
      type: "propose_trade", to: 2,
      give: { cash: 0, cities: [], companies: [0] }, // seat 1 doesn't own company 0
      get: { cash: 0, cities: [], companies: [] },
    });
    expect("error" in r1 && r1.error).toBe("bad_give");
    s.companies[0] = 1;
    const r2 = applyIntent(s, 1, {
      type: "propose_trade", to: 2,
      give: { cash: 0, cities: [], companies: [0] },
      get: { cash: 0, cities: [], companies: [] }, // nothing offered back
    });
    expect("error" in r2 && r2.error).toBe("bad_get");
  });
});
