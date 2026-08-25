import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { BOARD } from "@/modules/vyapaar/engine/board";

// New turn model: strictly one roll per turn (doubles give no bonus roll), and
// landing on your OWN developable city pauses in `manage` so you can build before
// ending the turn (smart pause — nothing to build → auto-advance).
describe("turn model — one roll per turn + smart develop pause", () => {
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

  it("landing on your own developable city pauses in manage; end_turn then advances", () => {
    let sawManage = false;
    for (let seed = 0; seed < 200 && !sawManage; seed++) {
      const s = createGame(seed, ["a", "b"]);
      for (const c of s.cities) c.owner = 0; // seat 0 owns every city → every zone set controlled
      applyIntent(s, 0, { type: "roll" });
      const tile = BOARD[s.players[0].pos];
      if (tile.kind === "city") {
        sawManage = true;
        expect(s.phase).toBe("manage"); // paused to let seat 0 build
        expect(s.active).toBe(0);
        applyIntent(s, 0, { type: "end_turn" });
        expect(s.active).toBe(1);
        expect(s.phase).toBe("roll");
      } else {
        expect(s.phase).not.toBe("manage"); // non-city landings never park
      }
    }
    expect(sawManage).toBe(true);
  });

});
