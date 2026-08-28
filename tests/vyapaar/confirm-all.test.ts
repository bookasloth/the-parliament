import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";

describe("confirm_all_payments — clear the whole queue at once", () => {
  it("settles every payment the seat owns and credits each party", () => {
    const s = createGame(1, ["a", "b", "c"], 25000);
    s.payments = [
      { id: 1, actor: 0, dir: "pay", amount: 500, party: 1, reason: "festival", expiresAt: 0 },
      { id: 2, actor: 0, dir: "pay", amount: 500, party: 2, reason: "festival", expiresAt: 0 },
      { id: 3, actor: 0, dir: "collect", amount: 300, party: "bank", reason: "mandi", expiresAt: 0 },
    ];
    const r = applyIntent(s, 0, { type: "confirm_all_payments" });
    expect("state" in r).toBe(true);
    expect(s.payments).toHaveLength(0);
    expect(s.players[0].cash).toBe(25000 - 500 - 500 + 300);
    expect(s.players[1].cash).toBe(25000 + 500);
    expect(s.players[2].cash).toBe(25000 + 500);
  });

  it("only clears YOUR payments, leaving others'", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.payments = [
      { id: 1, actor: 0, dir: "pay", amount: 500, party: "bank", reason: "x", expiresAt: 0 },
      { id: 2, actor: 1, dir: "pay", amount: 700, party: "bank", reason: "x", expiresAt: 0 },
    ];
    applyIntent(s, 0, { type: "confirm_all_payments" });
    expect(s.payments).toHaveLength(1);
    expect(s.payments![0].actor).toBe(1);
    expect(s.players[0].cash).toBe(25000 - 500);
  });

  it("errors when you have nothing pending", () => {
    const s = createGame(1, ["a", "b"], 25000);
    const r = applyIntent(s, 0, { type: "confirm_all_payments" });
    expect("error" in r && r.error).toBe("no_payment");
  });
});
