import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { stampNewTrades, sweepExpiredTrades } from "@/modules/vyapaar/engine/trade-expiry";
import { TRADE_SECONDS } from "@/config/vyapaar-match";

function gameWithOffer() {
  const s = createGame(1, ["a", "b", "c"]);
  s.active = 0;
  s.cities[0].owner = 1;
  s.cities[6].owner = 2;
  applyIntent(s, 1, { type: "propose_trade", to: 2, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [6] } });
  return s;
}

describe("trade expiry (server glue)", () => {
  it("stamps a 60s deadline on a freshly proposed trade", () => {
    const s = gameWithOffer();
    expect(s.trades[0].expiresAt).toBe(0); // engine leaves it unstamped
    const now = 1_000_000;
    stampNewTrades(s, now);
    expect(s.trades[0].expiresAt).toBe(now + TRADE_SECONDS * 1000);
  });

  it("does not re-stamp an already-stamped trade", () => {
    const s = gameWithOffer();
    stampNewTrades(s, 1_000_000);
    const first = s.trades[0].expiresAt;
    stampNewTrades(s, 5_000_000); // later call must not move the deadline
    expect(s.trades[0].expiresAt).toBe(first);
  });

  it("sweeps trades at/after the deadline and logs an expire intent", () => {
    const s = gameWithOffer();
    const now = 1_000_000;
    stampNewTrades(s, now);
    const deadline = s.trades[0].expiresAt;

    // before the deadline: nothing swept
    expect(sweepExpiredTrades(s, deadline - 1)).toHaveLength(0);
    expect(s.trades).toHaveLength(1);

    // at the deadline: swept, city ownership untouched
    const applied = sweepExpiredTrades(s, deadline);
    expect(applied).toHaveLength(1);
    expect(applied[0].intent).toEqual({ type: "expire_trade", tradeId: 1 });
    expect(s.trades).toHaveLength(0);
    expect(s.cities[0].owner).toBe(1); // never swapped
  });

  it("leaves un-stamped (expiresAt=0) trades alone", () => {
    const s = gameWithOffer(); // not stamped
    expect(sweepExpiredTrades(s, 9_999_999)).toHaveLength(0);
    expect(s.trades).toHaveLength(1);
  });
});
