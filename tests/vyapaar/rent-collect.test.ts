import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { BOARD } from "@/modules/vyapaar/engine/board";

// Rent is now a payer-confirmed auto-payment: allow within the window (pay the owner) or
// it auto-resolves at 2× — the owner still gets the rent, the extra 1× splits
// half-to-bank / half-among the other active players.
describe("rent as an allow-or-double payment", () => {
  it("landing on a rival city queues a rent payment on the payer — not an immediate charge", () => {
    let landed = false;
    for (let seed = 1; seed <= 40 && !landed; seed++) {
      const s = createGame(seed, ["a", "b"]);
      for (const c of s.cities) c.owner = 1; // seat 1 owns everything
      const before = s.players[0].cash;
      applyIntent(s, 0, { type: "roll" });
      const tile = BOARD[s.players[0].pos];
      if (tile.kind !== "city") continue;
      landed = true;
      const rent = (s.payments ?? []).find((p) => p.reason === "rent");
      expect(rent).toBeTruthy();
      expect(rent).toMatchObject({ actor: 0, dir: "pay", party: 1 });
      expect(rent!.amount).toBeGreaterThan(0);
      expect(s.players[0].cash).toBe(before); // NOT charged on landing
    }
    expect(landed).toBe(true);
  });

  it("allow pays the owner exactly once; a double-confirm errors (idempotent)", () => {
    const s = createGame(1, ["a", "b"]);
    s.payments = [{ id: 7, actor: 0, dir: "pay", amount: 300, party: 1, reason: "rent", expiresAt: 0 }];
    const payerBefore = s.players[0].cash, ownerBefore = s.players[1].cash;
    const r1 = applyIntent(s, 0, { type: "confirm_payment", paymentId: 7 });
    expect("state" in r1).toBe(true);
    expect(s.players[0].cash).toBe(payerBefore - 300);
    expect(s.players[1].cash).toBe(ownerBefore + 300);
    const r2 = applyIntent(s, 0, { type: "confirm_payment", paymentId: 7 });
    expect("error" in r2).toBe(true);
    expect(s.players[0].cash).toBe(payerBefore - 300); // never paid twice
  });

  it("only the payer can confirm their rent", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.payments = [{ id: 3, actor: 0, dir: "pay", amount: 200, party: 1, reason: "rent", expiresAt: 0 }];
    const r = applyIntent(s, 2, { type: "confirm_payment", paymentId: 3 });
    expect("error" in r && r.error).toBe("not_your_payment");
  });

  it("confirming is legal off-turn (the payer may not be the active player)", () => {
    const s = createGame(1, ["a", "b"]);
    s.active = 1; // seat 0 (the payer) is not active
    s.payments = [{ id: 9, actor: 0, dir: "pay", amount: 250, party: 1, reason: "rent", expiresAt: 0 }];
    const r = applyIntent(s, 0, { type: "confirm_payment", paymentId: 9 });
    expect("state" in r).toBe(true);
    expect(s.payments).toHaveLength(0);
  });

  it("missing the window charges 2×: owner gets the rent, the extra splits half-bank/half-others", () => {
    const s = createGame(1, ["a", "b", "c"]); // seat 0 owes seat 1; seat 2 is the other
    s.payments = [{ id: 1, actor: 0, dir: "pay", amount: 400, party: 1, reason: "rent", expiresAt: 0 }];
    const p0 = s.players[0].cash, p1 = s.players[1].cash, p2 = s.players[2].cash;
    applyIntent(s, 0, { type: "expire_payment", paymentId: 1 });
    expect(s.players[0].cash).toBe(p0 - 800); // paid double
    const toBank = Math.floor(400 / 2); // 200
    const rest = 400 - toBank; // 200 split among others (seats 1 & 2) → 100 each
    expect(s.players[1].cash).toBe(p1 + 400 + Math.floor(rest / 2)); // rent + share
    expect(s.players[2].cash).toBe(p2 + Math.floor(rest / 2)); // just the share
    expect(s.payments).toHaveLength(0);
  });
});
