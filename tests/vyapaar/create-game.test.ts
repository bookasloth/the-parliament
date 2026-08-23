import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { HEADLINE, UPI } from "@/modules/vyapaar/engine/data";

describe("createGame", () => {
  it("rejects <2 or >6 players", () => {
    expect(() => createGame(1, ["solo"])).toThrow();
    expect(() => createGame(1, ["a", "b", "c", "d", "e", "f", "g"])).toThrow();
  });

  it("initialises players with the opening cash", () => {
    const g = createGame(1, ["a", "b", "c"], 25000);
    expect(g.players).toHaveLength(3);
    expect(g.players.every((p) => p.cash === 25000 && p.pos === 0)).toBe(true);
    expect(g.cities).toHaveLength(25);
    expect(g.hubs).toEqual([null, null, null, null]);
    expect(g.active).toBe(0);
    expect(g.phase).toBe("roll");
  });

  it("seeds full decks deterministically from the seed", () => {
    const a = createGame(777, ["a", "b"]);
    const b = createGame(777, ["a", "b"]);
    expect(a.headlineDeck).toEqual(b.headlineDeck);
    expect(a.upiDeck).toEqual(b.upiDeck);
    expect([...a.headlineDeck].sort()).toEqual(HEADLINE.map((_, i) => i));
    expect([...a.upiDeck].sort()).toEqual(UPI.map((_, i) => i));
  });
});
