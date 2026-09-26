import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { BOARD } from "@/modules/vyapaar/engine/board";

// Turn model: strictly one roll per turn (doubles give no bonus roll). Building is a turn
// action taken INSTEAD of rolling (see the develop intent) — a roll never pauses to build, so
// landing on your own city just auto-advances.
describe("turn model — one roll per turn + build-instead-of-rolling", () => {
  it("doubles grant no bonus roll (the turn never stays with the same seat to reroll)", () => {
    let sawDouble = false;
    for (let seed = 0; seed < 500; seed++) {
      const s = createGame(seed, ["a", "b"]);
      const r = applyIntent(s, 0, { type: "roll" });
      if (!("state" in r)) continue;
      const roll = r.events.find(
        (e): e is { type: "roll"; seat: number; a: number; b: number } => e.type === "roll",
      );
      if (!roll || roll.a !== roll.b) continue; // only care about doubles
      sawDouble = true;
      expect(s.pendingDouble).toBe(false);
      // if it's still the roll phase, the turn must have advanced to the other seat
      if (s.phase === "roll") expect(s.active).toBe(1);
    }
    expect(sawDouble).toBe(true); // sanity: the search range actually hit a double
  });

  it("landing on your own city no longer pauses — the turn auto-advances (build is instead of rolling)", () => {
    let sawOwnCity = false;
    for (let seed = 0; seed < 200 && !sawOwnCity; seed++) {
      const s = createGame(seed, ["a", "b"]);
      for (const c of s.cities) c.owner = 0; // seat 0 owns every city
      applyIntent(s, 0, { type: "roll" });
      const tile = BOARD[s.players[0].pos];
      if (tile.kind === "city") {
        sawOwnCity = true;
        expect(s.phase).not.toBe("manage"); // a roll never stops to build
        expect(s.active).toBe(1);            // auto-advanced to the other seat
      }
    }
    expect(sawOwnCity).toBe(true);
  });

  it("build instead of rolling: develop from the roll phase without moving, one per set, then end", () => {
    const s = createGame(1, ["a", "b"], 50000);
    for (const id of [0, 1, 2]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // North
    s.active = 0; s.phase = "roll";
    const r = applyIntent(s, 0, { type: "develop", cityId: 1 }); // build, no roll
    expect("state" in r).toBe(true);
    expect(s.cities[1].level).toBe(1);
    expect(s.phase).toBe("manage");
    expect(s.players[0].pos).toBe(0); // never moved
    applyIntent(s, 0, { type: "end_turn" });
    expect(s.active).toBe(1);
    expect(s.builtZones).toEqual([]); // reset for the next turn
  });

});
