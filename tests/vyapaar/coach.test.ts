import { describe, it, expect } from "vitest";
import { coachTips } from "@/modules/vyapaar/coach";
import type { PublicView } from "@/modules/vyapaar/engine/view";
import { CITY_POS } from "@/modules/vyapaar/engine/board";
import { COMPANY_POS, upgradeCost } from "@/modules/vyapaar/engine/data";

// Zone grouping (data.ts): 0-4 North, 5-9 South, 10-14 East, 15-19 West, 20-24 Central.
// A "set" = SET_OWN_NEEDED (3) unmortgaged cities in a zone.

function view(over: Partial<PublicView> = {}, cash = 25000): PublicView {
  return {
    players: [
      { name: "You Player", cash, pos: 0, halted: 0, score: 0, netWorth: cash, left: false },
      { name: "Aastha Rao", cash: 25000, pos: 0, halted: 0, score: 0, netWorth: 25000, left: false },
      { name: "Shubham Kite", cash: 25000, pos: 0, halted: 0, score: 0, netWorth: 25000, left: false },
    ],
    cities: Array.from({ length: 25 }, () => ({ owner: null as number | null, level: 0, mortgaged: false })),
    companies: [null, null, null, null, null, null],
    active: 0, phase: "roll", round: 1, pendingCity: null, pendingCompany: null,
    auction: null, trades: [], payments: [], ended: false, winner: null, lastRoll: null,
    log: [], you: 0, youCanRestructure: false, restructure: { advance: 0, laps: 0 },
    ...over,
  };
}
const own = (v: PublicView, id: number, seat: number, extra: Partial<PublicView["cities"][number]> = {}) => {
  v.cities[id] = { owner: seat, level: 0, mortgaged: false, ...extra };
};

describe("coachTips — strategy advisor", () => {
  it("suggests building on the cheapest lowest-level city of a controlled zone", () => {
    const v = view();
    own(v, 0, 0); own(v, 1, 0); own(v, 2, 0); // North set (Delhi/Chandigarh/Jaipur)
    const tips = coachTips(v);
    const build = tips.find((t) => t.kind === "build");
    expect(build).toBeTruthy();
    expect(build!.pos).toBe(CITY_POS[2]); // Jaipur — cheapest upgrade of the three
    expect(build!.text).toContain("₹" + upgradeCost(2).toLocaleString("en-IN"));
  });

  it("does NOT suggest building when you can't afford the cheapest upgrade", () => {
    const v = view({}, 10); // near-broke
    own(v, 0, 0); own(v, 1, 0); own(v, 2, 0);
    expect(coachTips(v).some((t) => t.kind === "build")).toBe(false);
  });

  it("tells you to grab an unowned city to complete a set", () => {
    const v = view();
    own(v, 5, 0); own(v, 6, 0); // 2 of South, rest free
    const done = coachTips(v).find((t) => t.kind === "complete");
    expect(done).toBeTruthy();
    expect([7, 8, 9].map((id) => CITY_POS[id])).toContain(done!.pos);
    expect(done!.text).toMatch(/lock down the South/);
  });

  it("names the rival to trade with when the last piece is owned", () => {
    const v = view();
    own(v, 10, 0); own(v, 11, 0);      // your 2 East
    own(v, 12, 2); own(v, 13, 2); own(v, 14, 2); // Shubham holds the rest — none free
    const done = coachTips(v).find((t) => t.kind === "complete");
    expect(done).toBeTruthy();
    expect(done!.text).toMatch(/Shubham/);
    expect(done!.text).toMatch(/trade for it/);
  });

  it("spots a mutual double-set swap and names both cities", () => {
    const v = view();
    own(v, 0, 0); own(v, 1, 0);   // you: 2 North, need id2
    own(v, 2, 1);                 // Aastha holds your North piece
    own(v, 15, 1); own(v, 16, 1); // Aastha: 2 West, needs a West piece
    own(v, 17, 0);                // you hold a West piece Aastha needs
    const swap = coachTips(v).find((t) => t.kind === "swap");
    expect(swap).toBeTruthy();
    expect(swap!.text).toMatch(/Swap your/);
    expect(swap!.text).toMatch(/Aastha/);
  });

  it("suggests clearing a mortgage that would restore zone control", () => {
    const v = view();
    own(v, 0, 0); own(v, 1, 0);              // 2 unmortgaged North
    own(v, 2, 0, { mortgaged: true });       // 3rd owned but mortgaged
    const un = coachTips(v).find((t) => t.kind === "unmortgage");
    expect(un).toBeTruthy();
    expect(un!.pos).toBe(CITY_POS[2]);
  });

  it("suggests trading away a lone card a rival is chasing", () => {
    const v = view();
    own(v, 20, 0);            // your only Central card
    own(v, 21, 1); own(v, 22, 1); // Aastha chasing Central
    const away = coachTips(v).find((t) => t.kind === "trade-away");
    expect(away).toBeTruthy();
    expect(away!.pos).toBe(CITY_POS[20]);
  });

  it("suggests grabbing the paired company to double fees", () => {
    const v = view();
    v.companies[0] = 0; // you own company 0; partner is 1 (unowned)
    const co = coachTips(v).find((t) => t.kind === "company");
    expect(co).toBeTruthy();
    expect(co!.pos).toBe(COMPANY_POS[1]);
  });

  it("caps at 5 tips even with many opportunities", () => {
    const v = view();
    // controlled zones (build) across all five zones
    for (let z = 0; z < 5; z++) { own(v, z * 5, 0); own(v, z * 5 + 1, 0); own(v, z * 5 + 2, 0); }
    v.companies[0] = 0;
    expect(coachTips(v).length).toBeLessThanOrEqual(5);
  });

  it("falls back to an idle nudge when there's nothing to do", () => {
    const tips = coachTips(view());
    expect(tips).toHaveLength(1);
    expect(tips[0].kind).toBe("idle");
  });

  it("ignores players who have left the game", () => {
    const v = view();
    v.players[1].left = true;        // Aastha left
    own(v, 20, 0);                   // your lone Central card
    own(v, 21, 1); own(v, 22, 1);    // ...but the chaser has left → no trade-away
    expect(coachTips(v).some((t) => t.kind === "trade-away")).toBe(false);
  });
});
