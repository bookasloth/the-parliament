import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, canRestructure } from "@/modules/vyapaar/engine/engine";
import { RESTRUCTURE_ADVANCE, RESTRUCTURE_LAPS, RESTRUCTURE_PENALTY } from "@/modules/vyapaar/engine/data";

// seat 0 far behind seat 1 → seat 0 is the underdog, on its own turn (roll phase).
function underdogGame() {
  const s = createGame(1, ["a", "b"]);
  s.players[0].cash = 1000; // net worth 1000
  s.players[1].cash = 25000; // net worth 25000 → 1000 < 0.6×25000
  s.active = 0;
  s.phase = "roll";
  return s;
}

describe("comeback / restructure", () => {
  it("is self-repaying by construction (advance = laps × penalty)", () => {
    expect(RESTRUCTURE_ADVANCE).toBe(RESTRUCTURE_LAPS * RESTRUCTURE_PENALTY);
  });

  it("the underdog can take the advance once; cash rises and repayment is armed", () => {
    const s = underdogGame();
    expect(canRestructure(s, 0)).toBe(true);
    const before = s.players[0].cash;
    const r = applyIntent(s, 0, { type: "restructure" });
    expect("state" in r).toBe(true);
    expect(s.players[0].cash).toBe(before + RESTRUCTURE_ADVANCE);
    expect(s.players[0].restructured).toBe(true);
    expect(s.players[0].startupLaps).toBe(RESTRUCTURE_LAPS);
    expect(s.players[0].startupPenalty).toBe(RESTRUCTURE_PENALTY);
  });

  it("cannot be taken twice (one-time)", () => {
    const s = underdogGame();
    applyIntent(s, 0, { type: "restructure" });
    // still the underdog, but already used it and now repaying → blocked
    expect(canRestructure(s, 0)).toBe(false);
    const r = applyIntent(s, 0, { type: "restructure" });
    expect("error" in r).toBe(true);
  });

  it("the leader (not the underdog) cannot restructure", () => {
    const s = underdogGame();
    s.active = 1;
    expect(canRestructure(s, 1)).toBe(false);
    const r = applyIntent(s, 1, { type: "restructure" });
    expect("error" in r).toBe(true);
  });

  it("cannot restructure while still repaying a prior startup/restructure", () => {
    const s = underdogGame();
    s.players[0].startupLaps = 2; // mid-repayment
    expect(canRestructure(s, 0)).toBe(false);
  });

  it("is only legal on your own turn", () => {
    const s = underdogGame(); // active is 0
    const r = applyIntent(s, 1, { type: "restructure" }); // seat 1 acting out of turn
    expect("error" in r).toBe(true);
  });

  it("a left player cannot restructure", () => {
    const s = underdogGame();
    s.players[0].left = true;
    expect(canRestructure(s, 0)).toBe(false);
  });
});
