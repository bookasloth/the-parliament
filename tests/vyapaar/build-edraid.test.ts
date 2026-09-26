import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { applyEvent } from "@/modules/vyapaar/engine/cards";
import { CITY_POS } from "@/modules/vyapaar/engine/board";
import { MONSOON_POS, JAIL_TURNS } from "@/modules/vyapaar/engine/data";

// North set = cityIds 0,1,2 (need SET_OWN_NEEDED=3 to control).
function controllingNorth() {
  const s = createGame(1, ["a", "b"], 50000);
  for (const id of [0, 1, 2]) s.cities[id] = { owner: 0, level: 0, mortgaged: false };
  s.active = 0;
  return s;
}

describe("build instead of rolling — one level per set per turn", () => {
  it("builds from the roll phase (build instead of rolling) and moves into manage", () => {
    const s = controllingNorth();
    s.phase = "roll";
    const r = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("state" in r).toBe(true);
    expect(s.cities[0].level).toBe(1);
    expect(s.phase).toBe("manage"); // stay to build your other sets, then end
    expect(s.active).toBe(0);
    expect(s.players[0].pos).toBe(0); // you didn't roll — you never moved
  });

  it("only one level per set per turn — a second build on the same set is rejected", () => {
    const s = controllingNorth();
    s.phase = "manage";
    applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect(s.cities[0].level).toBe(1);
    // any further North build this turn is blocked — even on a different city (no even-build now)
    const same = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("error" in same && same.error).toBe("set_built_this_turn");
    const other = applyIntent(s, 0, { type: "develop", cityId: 1 });
    expect("error" in other && other.error).toBe("set_built_this_turn");
    expect(s.cities[1].level).toBe(0);
    applyIntent(s, 0, { type: "end_turn" });
    expect(s.active).not.toBe(0);
  });

  it("builds one level on EACH controlled set in a turn (2 sets → 2 builds)", () => {
    const s = createGame(1, ["a", "b"], 50000);
    for (const id of [0, 1, 2]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // North
    for (const id of [5, 6, 7]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // South
    s.active = 0; s.phase = "manage";
    applyIntent(s, 0, { type: "develop", cityId: 0 }); // North, any city
    applyIntent(s, 0, { type: "develop", cityId: 5 }); // South, any city
    expect(s.cities[0].level).toBe(1);
    expect(s.cities[5].level).toBe(1);
    // both sets now locked for this turn
    expect("error" in applyIntent(s, 0, { type: "develop", cityId: 6 })).toBe(true);
  });
});

describe("ED raid — pay in 10s or jail + ₹2000", () => {
  it("a missed ED-raid payment jails the dodger and charges ₹2000 once (no double)", () => {
    const s = createGame(1, ["a", "b"], 50000);
    s.active = 0;
    applyEvent(s, "ed_raid"); // queues a pay-2000-to-bank payment for seat 0
    const pay = (s.payments ?? []).find((p) => p.reason === "event:ed_raid");
    expect(pay).toBeTruthy();
    const before = s.players[0].cash;

    const r = applyIntent(s, 0, { type: "expire_payment", paymentId: pay!.id });
    expect("state" in r).toBe(true);
    expect(s.players[0].cash).toBe(before - 2000); // charged once, NOT doubled
    expect(s.players[0].halted).toBe(JAIL_TURNS);   // off to jail
    expect(s.players[0].pos).toBe(MONSOON_POS);
    expect((r as { events: { type: string }[] }).events.some((e) => e.type === "ed_raid_jail")).toBe(true);
  });

  it("paying the ED raid in time (confirm) does NOT jail you", () => {
    const s = createGame(1, ["a", "b"], 50000);
    s.active = 0;
    applyEvent(s, "ed_raid");
    const pay = (s.payments ?? []).find((p) => p.reason === "event:ed_raid");
    const before = s.players[0].cash;
    applyIntent(s, 0, { type: "confirm_payment", paymentId: pay!.id });
    expect(s.players[0].cash).toBe(before - 2000);
    expect(s.players[0].halted).toBe(0); // stayed free
  });
});
