import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { CITIES, UNMORTGAGE_RATE, upgradeCost } from "@/modules/vyapaar/engine/data";

function ownNorthSet(s: ReturnType<typeof createGame>) {
  s.cities[0].owner = 0;
  s.cities[1].owner = 0;
  s.cities[2].owner = 0; // controls North (zone 0)
  s.phase = "manage";
}

describe("develop / mortgage", () => {
  it("develops only on a controlled set, enforcing even-building", () => {
    const s = createGame(1, ["a", "b"]);
    ownNorthSet(s);
    const cost = upgradeCost(0);
    const r = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("state" in r).toBe(true);
    expect(s.cities[0].level).toBe(1);
    expect(s.players[0].cash).toBe(7500 - cost);
    // even-building: can't take city 0 to level 2 while 1 and 2 are still level 0
    const r2 = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("error" in r2).toBe(true);
    expect(s.cities[0].level).toBe(1);
  });

  it("refuses development without set control", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0; // only one city
    s.phase = "manage";
    const r = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("error" in r).toBe(true);
  });

  it("mortgages an undeveloped city for half price and blocks mortgaging a developed one", () => {
    const s = createGame(1, ["a", "b"]);
    ownNorthSet(s);
    applyIntent(s, 0, { type: "mortgage", cityId: 1 });
    expect(s.cities[1].mortgaged).toBe(true);
    expect(s.players[0].cash).toBe(7500 + Math.floor(CITIES[1].price / 2));
    // develop city 0 then it can't be mortgaged
    // (city 0 is level 0, set no longer controlled since city 1 mortgaged — re-own to test mortgage block)
    s.cities[1].mortgaged = false;
    s.cities[0].level = 1;
    const r = applyIntent(s, 0, { type: "mortgage", cityId: 0 });
    expect("error" in r).toBe(true);
  });

  it("unmortgages at price*0.55 rounded", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[0].mortgaged = true;
    s.phase = "manage";
    const cost = Math.round(CITIES[0].price * UNMORTGAGE_RATE);
    applyIntent(s, 0, { type: "unmortgage", cityId: 0 });
    expect(s.cities[0].mortgaged).toBe(false);
    expect(s.players[0].cash).toBe(7500 - cost);
  });

  it("rejects an out-of-range cityId", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "manage";
    const r = applyIntent(s, 0, { type: "develop", cityId: 999 });
    expect("error" in r).toBe(true);
  });
});
