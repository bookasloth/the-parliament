import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, autoResolve } from "@/modules/vyapaar/engine/engine";
import { replay } from "@/modules/vyapaar/engine/replay";
import { nextRng } from "@/modules/vyapaar/engine/rng";

function total(s: ReturnType<typeof createGame>): number {
  return s.players.reduce((n, p) => n + p.cash, 0) + s.pot;
}

// Events that move money in/out of the "cash + pot" universe (mint or burn).
const MINT_BURN = new Set([
  "salary",
  "card",
  "draw",
  "mandi",
  "develop",
  "mortgage",
  "unmortgage",
  "buy",
  "buy_hub",
  "auction_won",
  "free_upgrade",
  "downgrade",
]);

describe("determinism + money conservation", () => {
  it("replays a full auto-played game to the identical final state", () => {
    const names = ["a", "b", "c", "d"];
    const log: { seat: number; intent: import("@/modules/vyapaar/engine/state").Intent }[] = [];

    // Drive a full game via autoResolve, recording each successful concrete intent.
    const s = createGame(2026, names, 25000);
    let guard = 0;
    while (!s.ended && guard++ < 5000) {
      const active = s.active;
      const phase = s.phase;
      const intent =
        phase === "roll"
          ? { type: "roll" as const }
          : phase === "buy"
            ? { type: "decline" as const }
            : phase === "auction"
              ? { type: "bid" as const, amount: 0 }
              : { type: "end_turn" as const };
      const seat = phase === "auction" ? s.auction!.bids.findIndex((b) => b === null) : active;
      const before = JSON.stringify(s);
      const r = applyIntent(s, seat, intent);
      if ("state" in r) log.push({ seat, intent });
      else if (before !== JSON.stringify(s)) throw new Error("errored intent mutated state");
    }
    expect(s.ended).toBe(true);

    // Replaying the recorded log from the same seed reproduces the final state exactly.
    const s2 = replay(2026, names, log, 25000);
    expect(JSON.stringify(s2)).toBe(JSON.stringify(s));
  });

  it("conserves cash+pot except on explicit mint/burn steps (fuzz)", () => {
    const rngHolder = { rng: 4242 };
    for (let game = 0; game < 20; game++) {
      const n = 2 + Math.floor(nextRng(rngHolder) * 5); // 2..6
      const names = Array.from({ length: n }, (_, i) => `p${i}`);
      const s = createGame(1000 + game, names, 25000);
      let guard = 0;
      while (!s.ended && guard++ < 3000) {
        const before = total(s);
        const r = autoResolve(s);
        const events = "events" in r ? r.events : [];
        const touchedBank = events.some((e) => MINT_BURN.has(e.type));
        if (!touchedBank) {
          expect(total(s)).toBe(before); // pure transfer step conserves the total
        }
      }
    }
  });
});
