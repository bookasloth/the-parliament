import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import type { GameState } from "@/modules/vyapaar/engine/state";
import { applyEvent } from "@/modules/vyapaar/engine/cards";
import { EVENTS } from "@/modules/vyapaar/engine/data";

function game(n: number, cash = 25000): GameState {
  const s = createGame(1, Array.from({ length: n }, (_, i) => `p${i}`), cash);
  s.active = 0;
  return s;
}
const totalCash = (s: GameState) => s.players.reduce((t, p) => t + p.cash, 0);

// The five fixed Indian-business events. Money paths are mandatory to test: assert the
// active player's delta AND each other player's delta, and cash conservation for the
// player↔player events / mint-burn for the bank events.
describe("Indian-business events (applyEvent)", () => {
  it("Tax Return: bank pays the active player +1000 (money minted)", () => {
    for (const n of [2, 3, 4]) {
      const s = game(n);
      const before = totalCash(s);
      applyEvent(s, "tax_return");
      expect(s.players[0].cash).toBe(25000 + 1000);
      expect(totalCash(s)).toBe(before + 1000);
    }
  });

  it("ED Raided: active player pays 1000 to the bank (money burned)", () => {
    for (const n of [2, 3, 4]) {
      const s = game(n);
      const before = totalCash(s);
      applyEvent(s, "ed_raid");
      expect(s.players[0].cash).toBe(25000 - 1000);
      expect(totalCash(s)).toBe(before - 1000);
    }
  });

  it("Got Married: every other player pays the active player 500 (conserved)", () => {
    for (const n of [2, 3, 4]) {
      const s = game(n);
      const before = totalCash(s);
      applyEvent(s, "married");
      expect(s.players[0].cash).toBe(25000 + 500 * (n - 1));
      for (let i = 1; i < n; i++) expect(s.players[i].cash).toBe(25000 - 500);
      expect(totalCash(s)).toBe(before);
    }
  });

  it("Celebrate Festival: active player pays 500 to every other player (conserved)", () => {
    for (const n of [2, 3, 4]) {
      const s = game(n);
      const before = totalCash(s);
      applyEvent(s, "festival");
      expect(s.players[0].cash).toBe(25000 - 500 * (n - 1));
      for (let i = 1; i < n; i++) expect(s.players[i].cash).toBe(25000 + 500);
      expect(totalCash(s)).toBe(before);
    }
  });

  it("JNV Revisit: active pays 6000 split evenly among the others (conserved)", () => {
    for (const n of [2, 3, 4]) {
      const s = game(n);
      const before = totalCash(s);
      applyEvent(s, "jnv_revisit");
      const per = Math.floor(6000 / (n - 1)); // 6000 divides evenly for n-1 ∈ 1..5
      expect(s.players[0].cash).toBe(25000 - per * (n - 1));
      for (let i = 1; i < n; i++) expect(s.players[i].cash).toBe(25000 + per);
      expect(totalCash(s)).toBe(before);
    }
  });

  it("excludes players who have left from per-other events", () => {
    const s = game(4);
    s.players[2].left = true;
    applyEvent(s, "married"); // others = seats 1 and 3 only
    expect(s.players[0].cash).toBe(25000 + 500 * 2);
    expect(s.players[2].cash).toBe(25000); // a left player is untouched
  });

  it("insufficient cash on Festival liquidates then pays partial — never negative", () => {
    const s = game(3, 400); // active can't cover 500 × 2 and owns nothing to liquidate
    applyEvent(s, "festival");
    expect(s.players[0].cash).toBeGreaterThanOrEqual(0);
    expect(totalCash(s)).toBe(400 * 3); // still conserved (bankless transfer)
  });

  it("EVENTS table matches the design values", () => {
    expect(EVENTS.tax_return.val).toBe(1000);
    expect(EVENTS.married.val).toBe(500);
    expect(EVENTS.festival.val).toBe(500);
    expect(EVENTS.ed_raid.val).toBe(1000);
    expect(EVENTS.jnv_revisit.val).toBe(6000);
  });
});
