import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";

describe("trades", () => {
  it("swaps cities and settles net cash on accept", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0; // a owns Delhi (cityId 0)
    s.cities[6].owner = 1; // b owns Hyderabad (cityId 6)
    const r = applyIntent(s, 0, {
      type: "propose_trade",
      to: 1,
      give: { cash: 500, cities: [0] },
      get: { cash: 0, cities: [6] },
    });
    expect("state" in r).toBe(true);
    expect(s.trade).not.toBeNull();
    applyIntent(s, 1, { type: "respond_trade", accept: true });
    expect(s.cities[0].owner).toBe(1);
    expect(s.cities[6].owner).toBe(0);
    expect(s.players[0].cash).toBe(7500 - 500);
    expect(s.players[1].cash).toBe(7500 + 500);
    expect(s.trade).toBeNull();
  });

  it("only the recipient may respond", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.cities[0].owner = 0;
    applyIntent(s, 0, { type: "propose_trade", to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [] } });
    const r = applyIntent(s, 2, { type: "respond_trade", accept: true });
    expect("error" in r).toBe(true);
  });

  it("rejects proposing a developed city", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[0].level = 1;
    const r = applyIntent(s, 0, { type: "propose_trade", to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [] } });
    expect("error" in r).toBe(true);
  });

  it("declining clears the pending offer", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    applyIntent(s, 0, { type: "propose_trade", to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [] } });
    applyIntent(s, 1, { type: "respond_trade", accept: false });
    expect(s.trade).toBeNull();
    expect(s.cities[0].owner).toBe(0);
  });
});
