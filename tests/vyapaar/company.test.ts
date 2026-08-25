import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { companyServiceFee, netWorth } from "@/modules/vyapaar/engine/helpers";
import { COMPANIES } from "@/modules/vyapaar/engine/data";

describe("vyapaar companies", () => {
  it("buying a company sets the owner and removes exactly its price", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.phase = "buy"; s.pendingCompany = 0;
    const before = s.players[0].cash;
    const r = applyIntent(s, 0, { type: "buy" });
    expect("error" in r).toBe(false);
    expect(s.companies[0]).toBe(0);
    expect(s.pendingCompany).toBeNull();
    expect(s.players[0].cash).toBe(before - COMPANIES[0].buy);
  });

  it("rejects buying a company you can't afford", () => {
    const s = createGame(1, ["a", "b"], 100);
    s.phase = "buy"; s.pendingCompany = 2; // Timewheel, buy 6000
    expect("error" in applyIntent(s, 0, { type: "buy" })).toBe(true);
    expect(s.companies[2]).toBeNull();
  });

  it("charges the single fee with one of a pair, the pair rate with both", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.companies[0] = 0; // owner 0 holds one Travel company
    expect(companyServiceFee(s, 0)).toBe(COMPANIES[0].single);
    s.companies[1] = 0; // now holds BOTH of the Travel pair
    expect(companyServiceFee(s, 0)).toBe(COMPANIES[0].pair);
    expect(companyServiceFee(s, 1)).toBe(COMPANIES[1].pair);
  });

  it("charges nothing for an unowned company", () => {
    const s = createGame(1, ["a", "b"], 25000);
    expect(companyServiceFee(s, 3)).toBe(0);
  });

  it("declining a company sends it to a company auction", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.phase = "buy"; s.pendingCompany = 2;
    const r = applyIntent(s, 0, { type: "decline" });
    expect("error" in r).toBe(false);
    expect(s.phase).toBe("auction");
    expect(s.auction).toEqual({ kind: "company", index: 2, bids: [null, null] });
  });

  it("a company auction assigns ownership to the top bidder", () => {
    const s = createGame(3, ["a", "b"], 25000);
    s.phase = "auction"; s.auction = { kind: "company", index: 4, bids: [null, null] };
    applyIntent(s, 0, { type: "bid", amount: 3000 });
    applyIntent(s, 1, { type: "bid", amount: 1000 });
    expect(s.companies[4]).toBe(0); // seat 0's higher bid wins
    expect(s.players[0].cash).toBe(25000 - 3000);
    expect(s.auction).toBeNull();
  });

  it("counts owned companies in net worth (50% of buy)", () => {
    const s = createGame(1, ["a", "b"], 0); // no cash, no cities → isolate the company value
    s.companies[0] = 0;
    expect(netWorth(s, 0)).toBe(Math.round(COMPANIES[0].buy * 0.5));
  });
});
