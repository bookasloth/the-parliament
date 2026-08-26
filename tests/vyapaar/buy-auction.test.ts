import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { CITIES } from "@/modules/vyapaar/engine/data";

function landActiveOnCity(s: ReturnType<typeof createGame>, cityId: number) {
  // put the active player into the buy phase for a specific city
  s.phase = "buy";
  s.pendingCity = cityId;
  s.pendingDouble = false;
}

describe("buy / decline / auction", () => {
  it("buys the pending city and deducts its price", () => {
    const s = createGame(1, ["a", "b"]);
    landActiveOnCity(s, 24); // Jabalpur 3500 (affordable on the 7500 default)
    const r = applyIntent(s, 0, { type: "buy" });
    expect("state" in r).toBe(true);
    expect(s.cities[24].owner).toBe(0);
    expect(s.players[0].cash).toBe(7500 - CITIES[24].price);
    // turn auto-advances after buying — no manage park, no End-turn click
    expect(s.phase).toBe("roll");
    expect(s.active).toBe(1);
  });

  it("rejects buying when short on cash", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 10;
    landActiveOnCity(s, 0); // Delhi 9000
    const r = applyIntent(s, 0, { type: "buy" });
    expect("error" in r).toBe(true);
    expect(s.cities[0].owner).toBeNull();
  });

  it("declining a city opens an auction; highest bid wins and pays", () => {
    const s = createGame(1, ["a", "b", "c"]);
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    expect(s.phase).toBe("auction");
    applyIntent(s, 0, { type: "bid", amount: 100 });
    applyIntent(s, 1, { type: "bid", amount: 500 });
    applyIntent(s, 2, { type: "bid", amount: 0 });
    expect(s.cities[0].owner).toBe(1);
    expect(s.players[1].cash).toBe(7500 - 500);
    expect(s.auction).toBeNull();
    // auction resolution ends the lander's turn and auto-advances
    expect(s.phase).toBe("roll");
    expect(s.active).toBe(1);
  });

  it("an already-left player auto-passes — the auction resolves without waiting on them", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.players[2].left = true; // c already left the game
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    expect(s.phase).toBe("auction");
    expect(s.auction!.bids[2]).toBe(0); // left player pre-passed, not null
    applyIntent(s, 0, { type: "bid", amount: 300 });
    applyIntent(s, 1, { type: "bid", amount: 100 });
    // seats 0 and 1 are the only players still in — the auction resolves immediately
    expect(s.auction).toBeNull();
    expect(s.cities[0].owner).toBe(0);
  });

  it("all-zero auction leaves the city unowned", () => {
    const s = createGame(1, ["a", "b"]);
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    applyIntent(s, 0, { type: "bid", amount: 0 });
    applyIntent(s, 1, { type: "bid", amount: 0 });
    expect(s.cities[0].owner).toBeNull();
    expect(s.phase).toBe("roll");
    expect(s.active).toBe(1);
  });

  it("ties go to the lowest seat index", () => {
    const s = createGame(1, ["a", "b"]);
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    applyIntent(s, 0, { type: "bid", amount: 300 });
    applyIntent(s, 1, { type: "bid", amount: 300 });
    expect(s.cities[0].owner).toBe(0);
  });

  it("rejects a bid above the seat's cash", () => {
    const s = createGame(1, ["a", "b"]);
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    const r = applyIntent(s, 1, { type: "bid", amount: 999999 });
    expect("error" in r).toBe(true);
  });
});
