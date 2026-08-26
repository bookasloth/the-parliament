import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { BRIBE_BANK, BRIBE_EACH } from "@/modules/vyapaar/engine/data";

// Jail is its own phase: no dice. You either sit it out (serve_jail, one turn per call)
// or bribe your way out — pay the bank BRIBE_BANK + BRIBE_EACH to every other player.
function jailed(n = 3, seat = 0) {
  const s = createGame(1, Array.from({ length: n }, (_, i) => `p${i}`), 25000);
  s.players[seat].halted = 3;
  s.active = seat;
  s.phase = "jail";
  return s;
}

describe("jail — no rolling, sit it out or bribe", () => {
  it("a jailed player cannot roll", () => {
    const r = applyIntent(jailed(), 0, { type: "roll" });
    expect("error" in r).toBe(true);
  });

  it("serve_jail decrements the sentence and passes the turn", () => {
    const s = jailed();
    applyIntent(s, 0, { type: "serve_jail" });
    expect(s.players[0].halted).toBe(2);
    expect(s.active).not.toBe(0); // the turn passed on
  });

  it("a still-jailed player's next turn re-opens in the jail phase (not roll)", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.players[0].halted = 2; s.active = 0; s.phase = "jail";
    applyIntent(s, 0, { type: "serve_jail" }); // → halted 1, seat b's turn
    s.phase = "manage"; s.active = 1;
    applyIntent(s, 1, { type: "end_turn" }); // wraps back to seat 0, still halted
    expect(s.active).toBe(0);
    expect(s.phase).toBe("jail");
  });

  it("bribe_jail pays the bank + every other player and frees you to roll", () => {
    const s = jailed(3, 0);
    const total = BRIBE_BANK + BRIBE_EACH * 2;
    const r = applyIntent(s, 0, { type: "bribe_jail" });
    expect("state" in r).toBe(true);
    expect(s.players[0].halted).toBe(0);
    expect(s.phase).toBe("roll"); // freed — you roll this turn
    expect(s.players[0].cash).toBe(25000 - total);
    expect(s.players[1].cash).toBe(25000 + BRIBE_EACH);
    expect(s.players[2].cash).toBe(25000 + BRIBE_EACH);
  });

  it("bribe is refused if you can't afford the whole thing", () => {
    const s = jailed(3, 0);
    s.players[0].cash = 100;
    const r = applyIntent(s, 0, { type: "bribe_jail" });
    expect("error" in r && r.error).toBe("insufficient_funds");
  });

  it("a player who has left does not receive the bribe", () => {
    const s = jailed(3, 0);
    s.players[2].left = true;
    applyIntent(s, 0, { type: "bribe_jail" });
    expect(s.players[0].cash).toBe(25000 - (BRIBE_BANK + BRIBE_EACH)); // only seat 1 counts
    expect(s.players[2].cash).toBe(25000); // untouched
  });
});
