import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { netWorth, cityLiquidationValue, liquidationWorth } from "@/modules/vyapaar/engine/helpers";
import { CITIES, COMPANIES, upgradeCost, SET_MULT, PAIR_MULT, DEV_MULT } from "@/modules/vyapaar/engine/data";

// The transparent cash-out scoring model: full price, set premium ×1.4, pair ×1.4,
// buildings ×1.5, mortgaged at half; mid-game sell = full value − 2% TDS.
describe("cash-out scoring model", () => {
  it("prices a completed set at ×SET_MULT per card, an incomplete zone at full price", () => {
    const full = createGame(1, ["a", "b"], 0);
    for (const id of [0, 1, 2]) full.cities[id].owner = 0; // North set (3 cities)
    expect(netWorth(full, 0)).toBe(
      Math.round(CITIES[0].price * SET_MULT) + Math.round(CITIES[1].price * SET_MULT) + Math.round(CITIES[2].price * SET_MULT),
    );
    const partial = createGame(1, ["a", "b"], 0);
    for (const id of [0, 1]) partial.cities[id].owner = 0; // only 2 → no set, no premium
    expect(netWorth(partial, 0)).toBe(CITIES[0].price + CITIES[1].price);
  });

  it("values a company pair at ×PAIR_MULT and a solo company at full buy", () => {
    const pair = createGame(1, ["a", "b"], 0);
    pair.companies[2] = 0; pair.companies[3] = 0; // Timewheel + Book A Sloth are partners
    expect(netWorth(pair, 0)).toBe(Math.round(COMPANIES[2].buy * PAIR_MULT) + Math.round(COMPANIES[3].buy * PAIR_MULT));
    const solo = createGame(1, ["a", "b"], 0);
    solo.companies[2] = 0; // partner unowned
    expect(netWorth(solo, 0)).toBe(COMPANIES[2].buy);
  });

  it("adds DEV_MULT × build cost for developments", () => {
    const s = createGame(1, ["a", "b"], 0);
    for (const id of [0, 1, 2]) s.cities[id].owner = 0;
    s.cities[0].level = 2;
    const setValue = Math.round(CITIES[0].price * SET_MULT) + Math.round(CITIES[1].price * SET_MULT) + Math.round(CITIES[2].price * SET_MULT);
    expect(netWorth(s, 0)).toBe(setValue + Math.round(2 * upgradeCost(0) * DEV_MULT));
  });

  it("counts a mortgaged card at half with no set premium", () => {
    const s = createGame(1, ["a", "b"], 0);
    for (const id of [0, 1, 2]) s.cities[id].owner = 0;
    s.cities[0].mortgaged = true; // now only 2 unmortgaged in the zone → set no longer controlled
    expect(netWorth(s, 0)).toBe(Math.round(CITIES[0].price * 0.5) + CITIES[1].price + CITIES[2].price);
  });

  it("sell-to-bank pays full price + full building, minus 2% TDS", () => {
    const s = createGame(1, ["a", "b"], 0);
    s.cities[15].owner = 0; // Mumbai ₹9,500
    expect(cityLiquidationValue(s, 15)).toBe(Math.round(CITIES[15].price * 0.98));
    s.cities[15].level = 1;
    expect(cityLiquidationValue(s, 15)).toBe(Math.round((CITIES[15].price + upgradeCost(15)) * 0.98));
  });

  it("liquidationWorth (wallet settle) is the conservative sell-back — no set/pair premium", () => {
    const s = createGame(1, ["a", "b"], 1000);
    for (const id of [0, 1, 2]) s.cities[id].owner = 0; // a completed North set
    s.companies[2] = 0; s.companies[3] = 0; // a completed company pair
    // Full price − 2% for each card + full buy − 2% per company. NO ×1.4 anywhere.
    const expected = 1000
      + Math.round(CITIES[0].price * 0.98) + Math.round(CITIES[1].price * 0.98) + Math.round(CITIES[2].price * 0.98)
      + Math.round(COMPANIES[2].buy * 0.98) + Math.round(COMPANIES[3].buy * 0.98);
    expect(liquidationWorth(s, 0)).toBe(expected);
    // …and it's strictly less than net worth, which DOES apply the premiums.
    expect(liquidationWorth(s, 0)).toBeLessThan(netWorth(s, 0));
  });
});
