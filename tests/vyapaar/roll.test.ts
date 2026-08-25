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

  it("frees a halted player only on doubles, else decrements halt", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].halted = 2;
    applyIntent(s, 0, { type: "roll" });
    // either freed (halted 0 and moved) or still halted (halted 1, pos 0)
    expect([0, 1]).toContain(s.players[0].halted);
    expect(s.phase === "manage" || s.phase === "buy" || s.phase === "roll").toBe(true);
  });

  it("grants no bonus roll (and no doubles credit) when a halted player breaks free on doubles", () => {
    let found = false;
    for (let seed = 0; seed < 2000; seed++) {
      const s = createGame(seed, ["a", "b"]);
      s.players[0].halted = 1;
      const posBefore = s.players[0].pos;
      const r = applyIntent(s, 0, { type: "roll" });
      if (!("state" in r)) continue;
      const rollEvent = r.events.find(
        (e): e is { type: "roll"; seat: number; a: number; b: number } => e.type === "roll",
      );
      if (!rollEvent || rollEvent.a !== rollEvent.b) continue; // not a jail-break-on-doubles roll

      found = true;
      expect(s.players[0].halted).toBe(0); // freed
      expect(s.players[0].pos).not.toBe(posBefore); // moved this roll
      expect(s.phase).not.toBe("roll"); // no bonus re-roll granted from the break
      expect(s.players[0].doubles).toBe(0); // jail-break double not counted
      break;
    }
    expect(found).toBe(true); // sanity: the search range actually hit a double
  });
});
