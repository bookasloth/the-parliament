import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { CITIES, UNMORTGAGE_RATE, upgradeCost } from "@/modules/vyapaar/engine/data";
import { CITY_POS } from "@/modules/vyapaar/engine/board";

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
    expect(s.active).toBe(0); // build stays in `manage` — keep building this visit
    expect(s.phase).toBe("manage");
    // even-building: can't take city 0 to level 2 while 1 and 2 are still level 0
    const r2 = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("error" in r2 && r2.error).toBe("uneven_build");
    expect(s.cities[0].level).toBe(1);
  });

  it("build deep in one visit; a house can be built off-tile but a hotel needs you on the city", () => {
    const s = createGame(1, ["a", "b"]);
    ownNorthSet(s);
    s.players[0].pos = 0; // on Start, not on any North city
    // House (level 0→1) is allowed off-tile and stays your turn
    const h = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("state" in h).toBe(true);
    expect(s.cities[0].level).toBe(1);
    expect(s.active).toBe(0);
    // Bring the whole set to level 3 (all houses)
    s.cities[0].level = 3; s.cities[1].level = 3; s.cities[2].level = 3;
    // Hotel (3→4) off-tile is refused...
    const off = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("error" in off && off.error).toBe("must_be_on_city");
    expect(s.cities[0].level).toBe(3);
    // ...but allowed while standing on that city
    s.players[0].pos = CITY_POS[0];
    const on = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("state" in on).toBe(true);
    expect(s.cities[0].level).toBe(4);
    expect(s.active).toBe(0); // still your turn — end it yourself when done
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

  it("sells an undeveloped city back to the bank for its full price minus 2% TDS", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.cities[5].owner = 0;
    s.phase = "manage";
    const before = s.players[0].cash;
    const r = applyIntent(s, 0, { type: "sell", cityId: 5 });
    expect("error" in r).toBe(false);
    expect(s.cities[5].owner).toBeNull();
    expect(s.players[0].cash).toBe(before + Math.round(CITIES[5].price * 0.98));
  });

  it("sells a developed city outright, refunding full card + building value minus 2% TDS", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.cities[5].owner = 0;
    s.cities[5].level = 2;
    s.phase = "manage";
    const before = s.players[0].cash;
    const expected = Math.round((CITIES[5].price + 2 * upgradeCost(5)) * 0.98);
    const r = applyIntent(s, 0, { type: "sell", cityId: 5 });
    expect("error" in r).toBe(false);
    expect(s.cities[5].owner).toBeNull();
    expect(s.cities[5].level).toBe(0); // buildings cleared, tile reset
    expect(s.players[0].cash).toBe(before + expected);
  });

  it("a mortgaged city sells for nothing (the half was already drawn) and clears", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.cities[5].owner = 0;
    s.cities[5].mortgaged = true;
    s.phase = "manage";
    const before = s.players[0].cash;
    applyIntent(s, 0, { type: "sell", cityId: 5 });
    expect(s.cities[5].owner).toBeNull();
    expect(s.players[0].cash).toBe(before);
  });
});
