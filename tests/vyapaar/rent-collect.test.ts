import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { BOARD } from "@/modules/vyapaar/engine/board";

describe("rent collection", () => {
  it("landing on an owned city defers rent to a pending collect — no immediate charge", () => {
    // seat 1 owns every city; whatever city seat 0 lands on must defer rent.
    let landed = false;
    for (let seed = 1; seed <= 40 && !landed; seed++) {
      const s = createGame(seed, ["a", "b"]);
      for (const c of s.cities) c.owner = 1;
      const before = s.players[0].cash;
      applyIntent(s, 0, { type: "roll" });
      const tile = BOARD[s.players[0].pos];
      if (tile.kind !== "city") continue; // rolled onto a non-city; try next seed
      landed = true;
      expect(s.pendingRents.length).toBe(1);
      const r = s.pendingRents[0];
      expect(r.payer).toBe(0);
      expect(r.owner).toBe(1);
      expect(r.amount).toBeGreaterThan(0);
      expect(s.players[0].cash).toBe(before); // NOT charged on landing
    }
    expect(landed).toBe(true);
  });

  it("owner collects: money moves exactly once and a double-collect errors (idempotent)", () => {
    const s = createGame(1, ["a", "b"]);
    const cityId = 5, rent = 300;
    s.cities[cityId].owner = 1;
    s.pendingRents.push({ id: 7, payer: 0, owner: 1, cityId, amount: rent, age: 0 });
    const payerBefore = s.players[0].cash, ownerBefore = s.players[1].cash;

    const r1 = applyIntent(s, 1, { type: "collect_rent", rentId: 7 });
    expect("state" in r1).toBe(true);
    expect(s.players[0].cash).toBe(payerBefore - rent);
    expect(s.players[1].cash).toBe(ownerBefore + rent);
    expect(s.pendingRents).toHaveLength(0);

    const r2 = applyIntent(s, 1, { type: "collect_rent", rentId: 7 });
    expect("error" in r2).toBe(true); // already collected
    expect(s.players[0].cash).toBe(payerBefore - rent); // unchanged — never paid twice
  });

  it("only the owner may collect", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.cities[5].owner = 1;
    s.pendingRents.push({ id: 3, payer: 0, owner: 1, cityId: 5, amount: 200, age: 0 });
    const r = applyIntent(s, 2, { type: "collect_rent", rentId: 3 });
    expect("error" in r).toBe(true);
    expect(s.pendingRents).toHaveLength(1);
  });

  it("collecting is legal off-turn (owner need not be the active player)", () => {
    const s = createGame(1, ["a", "b"]);
    s.active = 0; // seat 0 is active; seat 1 (owner) is not
    s.cities[5].owner = 1;
    s.pendingRents.push({ id: 9, payer: 0, owner: 1, cityId: 5, amount: 250, age: 0 });
    const r = applyIntent(s, 1, { type: "collect_rent", rentId: 9 });
    expect("state" in r).toBe(true);
    expect(s.pendingRents).toHaveLength(0);
  });

  it("auto-settles after one full lap so an AFK owner never stalls the game", () => {
    const s = createGame(1, ["a", "b"]); // lap = 2 turns
    s.cities[5].owner = 1;
    s.pendingRents.push({ id: 1, payer: 0, owner: 1, cityId: 5, amount: 400, age: 0 });
    const payerBefore = s.players[0].cash, ownerBefore = s.players[1].cash;

    // end seat 0's turn (age 0 -> 1, not yet due)
    s.phase = "manage";
    applyIntent(s, 0, { type: "end_turn" });
    expect(s.pendingRents).toHaveLength(1);
    expect(s.players[1].cash).toBe(ownerBefore); // not paid yet

    // end seat 1's turn (age 1 -> 2 >= lap → auto-settle)
    s.phase = "manage";
    applyIntent(s, 1, { type: "end_turn" });
    expect(s.pendingRents).toHaveLength(0);
    expect(s.players[0].cash).toBe(payerBefore - 400);
    expect(s.players[1].cash).toBe(ownerBefore + 400);
  });

  it("voids (no charge) if the owner no longer owns the city at settle time", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[5].owner = 1;
    s.pendingRents.push({ id: 2, payer: 0, owner: 1, cityId: 5, amount: 400, age: 0 });
    s.cities[5].owner = 0; // ownership changed (e.g. traded/sold) before collect
    const payerBefore = s.players[0].cash, ownerBefore = s.players[1].cash;
    const r = applyIntent(s, 1, { type: "collect_rent", rentId: 2 });
    // owner mismatch now (owner field is 1 in the rent but city owner is 0) → not_your_rent?
    // No: rent.owner===1===seat, but city owner is 0 → settleRent voids it.
    expect("state" in r).toBe(true);
    expect(s.players[0].cash).toBe(payerBefore); // never charged
    expect(s.players[1].cash).toBe(ownerBefore);
    expect(s.pendingRents).toHaveLength(0);
  });
});
