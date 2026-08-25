import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyCard } from "@/modules/vyapaar/engine/cards";
import { citiesOwned } from "@/modules/vyapaar/engine/helpers";

describe("card opcodes", () => {
  it("skipNext increments the active player's halt counter", () => {
    const s = createGame(1, ["a", "b"]);
    const before = s.players[0].halted;
    applyCard(s, { id: "jam", op: "skipNext" });
    expect(s.players[0].halted).toBe(before + 1);
  });

  it("cashAll credits every player", () => {
    const s = createGame(1, ["a", "b", "c"]);
    const before = s.players.map((p) => p.cash);
    applyCard(s, { id: "diwali", op: "cashAll", val: 900 });
    expect(s.players.map((p) => p.cash)).toEqual(before.map((c) => c + 900));
  });

  it("collectEach moves cash from every other player to the active player", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.active = 0;
    applyCard(s, { id: "bollywood", op: "collectEach", val: 300 });
    expect(s.players[0].cash).toBe(7500 + 600);
    expect(s.players[1].cash).toBe(7500 - 300);
    expect(s.players[2].cash).toBe(7500 - 300);
  });

  it("feePerCity charges the pot per owned city", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[1].owner = 0;
    applyCard(s, { id: "fuel", op: "feePerCity", val: 150 });
    expect(s.pot).toBe(300);
    expect(s.players[0].cash).toBe(7500 - 300);
  });

  it("startup grants cash and a 3-lap salary penalty", () => {
    const s = createGame(1, ["a", "b"]);
    applyCard(s, { id: "startup", op: "startup", val: 1800 });
    expect(s.players[0].cash).toBe(7500 + 1800);
    expect(s.players[0].startupLaps).toBe(3);
    expect(s.players[0].startupPenalty).toBe(300);
  });

  it("freeUpgrade builds one level on a controlled set for free", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[1].owner = 0;
    s.cities[2].owner = 0; // Heritage set controlled
    const cashBefore = s.players[0].cash;
    applyCard(s, { id: "boom", op: "freeUpgrade" });
    const total = citiesOwned(s, 0).reduce((n, id) => n + s.cities[id].level, 0);
    expect(total).toBe(1);
    expect(s.players[0].cash).toBe(cashBefore); // free
  });

  it("downgradeRival drops the tallest rival building", () => {
    const s = createGame(1, ["a", "b"]);
    s.active = 0;
    s.cities[5].owner = 1;
    s.cities[5].level = 3;
    applyCard(s, { id: "demolition", op: "downgradeRival" });
    expect(s.cities[5].level).toBe(2);
  });

  it("cash credits the active player", () => {
    const s = createGame(1, ["a", "b"]);
    const before = s.players[0].cash;
    applyCard(s, { id: "windfall", op: "cash", val: 600 });
    expect(s.players[0].cash).toBe(before + 600);
  });

  it("feeToPot charges the active player into the pot, conserving total money", () => {
    const s = createGame(1, ["a", "b"]);
    const totalBefore = s.players.reduce((n, p) => n + p.cash, 0) + s.pot;
    const cashBefore = s.players[0].cash;
    applyCard(s, { id: "audit", op: "feeToPot", val: 600 });
    expect(s.pot).toBe(600);
    expect(s.players[0].cash).toBe(cashBefore - 600);
    const totalAfter = s.players.reduce((n, p) => n + p.cash, 0) + s.pot;
    expect(totalAfter).toBe(totalBefore);
  });

  it("perHeritage pays per North-zone city owned", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[1].owner = 0;
    const before = s.players[0].cash;
    applyCard(s, { id: "tourism", op: "perHeritage", val: 450 });
    expect(s.players[0].cash).toBe(before + 900);
  });

  it("perSet pays per controlled set", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[1].owner = 0;
    s.cities[2].owner = 0; // North set controlled
    const before = s.players[0].cash;
    applyCard(s, { id: "wedding", op: "perSet", val: 300 });
    expect(s.players[0].cash).toBe(before + 300);
  });
});
