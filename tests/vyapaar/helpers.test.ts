import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import {
  controlsSet,
  controlledSets,
  rentFor,
  netWorth,
  scoreOf,
  charge,
  liquidate,
  citiesOwned,
} from "@/modules/vyapaar/engine/helpers";
import { CITIES, SET_BONUS_NW, BLEND, upgradeCost } from "@/modules/vyapaar/engine/data";

// North zone = cityIds 0..4 (authored zone-grouped).
function own(s: ReturnType<typeof createGame>, seat: number, ids: number[]) {
  for (const id of ids) s.cities[id].owner = seat;
}

describe("helpers", () => {
  it("detects zone control at 3 of 5 unmortgaged", () => {
    const s = createGame(1, ["a", "b"]);
    own(s, 0, [0, 1]);
    expect(controlsSet(s, 0, 0)).toBe(false);
    own(s, 0, [2]);
    expect(controlsSet(s, 0, 0)).toBe(true);
    s.cities[2].mortgaged = true;
    expect(controlsSet(s, 0, 0)).toBe(false); // mortgaged doesn't count
  });

  it("computes rent: base, zone-double, developed, and scrappy-landlord", () => {
    const s = createGame(1, ["a", "b"]);
    // Owner holds exactly 1 city (id 0=Delhi) → not a set, ≤3 cities → scrappy ×1.25
    own(s, 0, [0]);
    expect(rentFor(s, 0)).toBe(Math.round(CITIES[0].rent[0] * 1.25));
    // 4 cities in North (0..3) → controls North AND >3 cities so no scrappy
    own(s, 0, [1, 2, 3]);
    expect(rentFor(s, 0)).toBe(CITIES[0].rent[0] * 2); // zone control doubles undeveloped base
    // Develop city 0 to level 2 → rent[2]
    s.cities[0].level = 2;
    expect(rentFor(s, 0)).toBe(CITIES[0].rent[2]);
    // Mortgaged → 0
    s.cities[0].mortgaged = true;
    expect(rentFor(s, 0)).toBe(0);
  });

  it("net worth and score use the documented formula", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 1000;
    own(s, 0, [0, 1, 2]); // North set (3 cities) → controlledSets = 1
    const price = CITIES[0].price + CITIES[1].price + CITIES[2].price;
    const nw = 1000 + price * 0.5 + SET_BONUS_NW * 1;
    expect(netWorth(s, 0)).toBe(nw);
    expect(scoreOf(s, 0)).toBe(1000 + BLEND * (nw - 1000));
    expect(controlledSets(s, 0)).toBe(1);
    expect(citiesOwned(s, 0).sort((x, y) => x - y)).toEqual([0, 1, 2]);
  });

  it("charge liquidates then forgives an unpayable shortfall", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 100;
    own(s, 0, [24]); // Jabalpur price 3500 → mortgage raises floor(3500/2)=1750
    const paid = charge(s, 0, 5000, "bank"); // owes 5000, can raise 100+1750=1850; rest forgiven
    expect(paid).toBe(1850);
    expect(s.players[0].cash).toBe(0);
    expect(s.cities[24].mortgaged).toBe(true);
  });

  it("liquidate sells the tallest upgrades before mortgaging", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 0;
    own(s, 0, [0, 1, 2]);
    s.cities[0].level = 2;
    liquidate(s, 0, 1); // needs only a little → sells one upgrade off the tallest
    expect(s.cities[0].level).toBe(1);
    expect(s.players[0].cash).toBe(Math.floor(upgradeCost(0) * 0.5));
  });
});
