import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import type { GameState } from "@/modules/vyapaar/engine/state";
import { applyEvent } from "@/modules/vyapaar/engine/cards";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { EVENTS } from "@/modules/vyapaar/engine/data";

function game(n: number, cash = 25000): GameState {
  const s = createGame(1, Array.from({ length: n }, (_, i) => `p${i}`), cash);
  s.active = 0;
  return s;
}
const totalCash = (s: GameState) => s.players.reduce((t, p) => t + p.cash, 0);

// Events no longer move money immediately — they QUEUE payments the actor must allow
// (or claim) within the window, or they auto-resolve with a penalty (2× + split) / forfeit.
describe("Indian-business events queue confirm-or-penalty payments", () => {
  it("Tax Return: queues a bank windfall the active player can claim (+1000)", () => {
    const s = game(3);
    applyEvent(s, "tax_return");
    expect(s.payments).toHaveLength(1);
    const p = s.payments![0];
    expect(p).toMatchObject({ actor: 0, dir: "collect", amount: 1000, party: "bank" });
    applyIntent(s, 0, { type: "confirm_payment", paymentId: p.id });
    expect(s.players[0].cash).toBe(25000 + 1000);
    expect(s.payments).toHaveLength(0);
  });

  it("Tax Return unclaimed in time is forfeited (no credit)", () => {
    const s = game(3);
    applyEvent(s, "tax_return");
    const id = s.payments![0].id;
    applyIntent(s, 0, { type: "expire_payment", paymentId: id });
    expect(s.players[0].cash).toBe(25000); // nothing minted
    expect(s.payments).toHaveLength(0);
  });

  it("ED Raid: pay ₹2000 in time (allow), or miss the window → jail + ₹2000 (no double)", () => {
    const s = game(3);
    applyEvent(s, "ed_raid");
    const p = s.payments![0];
    expect(p).toMatchObject({ actor: 0, dir: "pay", amount: 2000, party: "bank" });
    // allow → exactly 2000 leaves the game, you stay free
    const allow = game(3);
    applyEvent(allow, "ed_raid");
    applyIntent(allow, 0, { type: "confirm_payment", paymentId: allow.payments![0].id });
    expect(allow.players[0].cash).toBe(25000 - 2000);
    expect(allow.players[0].halted).toBe(0);
    // miss → charged ₹2000 once (NOT doubled, no split) and sent to jail
    applyIntent(s, 0, { type: "expire_payment", paymentId: p.id });
    expect(s.players[0].cash).toBe(25000 - 2000);
    expect(s.players[1].cash).toBe(25000); // others untouched — no penalty split
    expect(s.players[2].cash).toBe(25000);
    expect(s.players[0].halted).toBeGreaterThan(0); // jailed
  });

  it("Got Married: each other player owes the active player (allow settles it)", () => {
    const s = game(3);
    applyEvent(s, "married");
    expect(s.payments).toHaveLength(2); // seats 1 and 2 each owe 500 to seat 0
    for (const p of s.payments!) expect(p).toMatchObject({ dir: "pay", amount: 500, party: 0 });
    applyIntent(s, 1, { type: "confirm_payment", paymentId: s.payments!.find((p) => p.actor === 1)!.id });
    expect(s.players[1].cash).toBe(25000 - 500);
    expect(s.players[0].cash).toBe(25000 + 500);
  });

  it("only the actor can confirm a payment", () => {
    const s = game(3);
    applyEvent(s, "married");
    const p = s.payments!.find((x) => x.actor === 1)!;
    const r = applyIntent(s, 2, { type: "confirm_payment", paymentId: p.id }); // seat 2 isn't the actor
    expect("error" in r && r.error).toBe("not_your_payment");
  });

  it("excludes players who have left from per-other events", () => {
    const s = game(4);
    s.players[2].left = true;
    applyEvent(s, "married");
    expect(s.payments!.map((p) => p.actor).sort()).toEqual([1, 3]); // seat 2 skipped
  });

  it("EVENTS table matches the design values", () => {
    expect(EVENTS.tax_return.val).toBe(1000);
    expect(EVENTS.married.val).toBe(500);
    expect(EVENTS.festival.val).toBe(500);
    expect(EVENTS.ed_raid.val).toBe(2000);
    expect(EVENTS.jnv_revisit.val).toBe(6000);
  });

  it("conserves nothing out of thin air on allow (transfer only)", () => {
    const s = game(3);
    const before = totalCash(s);
    applyEvent(s, "festival"); // active owes each other 500
    for (const p of [...s.payments!]) applyIntent(s, 0, { type: "confirm_payment", paymentId: p.id });
    expect(totalCash(s)).toBe(before); // player→player, no mint/burn
    expect(s.players[0].cash).toBe(25000 - 500 * 2);
  });
});
