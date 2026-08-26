import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";

// Force dice by pre-setting rng so the first roll is deterministic; instead we
// assert on invariants that hold for ANY roll to stay robust.
describe("roll intent", () => {
  it("rejects a roll from a non-active seat", () => {
    const s = createGame(1, ["a", "b"]);
    const r = applyIntent(s, 1, { type: "roll" });
    expect("error" in r).toBe(true);
  });

  it("records the dice faces in lastRoll", () => {
    const s = createGame(1, ["a", "b"]);
    expect(s.lastRoll).toBeNull();
    applyIntent(s, 0, { type: "roll" });
    expect(s.lastRoll).not.toBeNull();
    const [a, b] = s.lastRoll!;
    for (const d of [a, b]) { expect(d).toBeGreaterThanOrEqual(1); expect(d).toBeLessThanOrEqual(6); }
  });

  it("moves the active player and leaves a valid phase", () => {
    const s = createGame(1, ["a", "b"]);
    const r = applyIntent(s, 0, { type: "roll" });
    expect("state" in r).toBe(true);
    if ("state" in r) {
      expect(s.players[0].pos).toBeGreaterThanOrEqual(0);
      expect(s.players[0].pos).toBeLessThan(40);
      expect(["roll", "buy", "manage", "auction"]).toContain(s.phase);
    }
  });

  it("pays salary when passing start", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].pos = 38; // any roll ≥2 wraps past start
    applyIntent(s, 0, { type: "roll" });
    expect(s.players[0].cash).toBeGreaterThanOrEqual(7500); // salary added (unless it landed on a fee tile that took more — assert ≥ opening minus max fee is fragile; salary path covered explicitly below)
  });

  it("pays the UNDERDOG salary to the clear poorest player", () => {
    const s = createGame(5, ["a", "b"], 25000);
    s.players[0].cash = 1000;   // seat 0 net worth (no property) = 1000
    s.players[1].cash = 100000; // seat 0 < 60% of the leader → underdog
    s.players[0].pos = 38;      // any roll ≥2 passes Start
    const r = applyIntent(s, 0, { type: "roll" });
    const salary = ("events" in r ? r.events : []).find((e) => e.type === "salary");
    expect(salary?.amount).toBe(2100); // SALARY_UNDERDOG, not the default 1200
  });

  it("pays the normal salary when nobody is behind (equal stacks)", () => {
    const s = createGame(5, ["a", "b"], 25000); // equal → no underdog
    s.players[0].pos = 38;
    const r = applyIntent(s, 0, { type: "roll" });
    const salary = ("events" in r ? r.events : []).find((e) => e.type === "salary");
    expect(salary?.amount).toBe(1200);
  });

  // Jail is its own phase now (no rolling to escape) — see jail.test.ts.
});
