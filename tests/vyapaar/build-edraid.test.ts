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

describe("no consecutive house farming — build only in manage phase", () => {
  it("rejects building during the roll phase (must roll first)", () => {
    const s = controllingNorth();
    s.phase = "roll";
    const r = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("error" in r && r.error).toBe("cannot_manage_now");
    expect(s.cities[0].level).toBe(0); // nothing built
  });

  it("allows building in the manage phase (after landing on your set) and ends the turn", () => {
    const s = controllingNorth();
    s.phase = "manage";
    const r = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("state" in r).toBe(true);
    expect(s.cities[0].level).toBe(1);
    expect(s.active).not.toBe(0); // developing IS your move — turn passed
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
