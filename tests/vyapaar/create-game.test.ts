import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";

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
    expect(g.companies).toEqual([null, null, null, null, null, null]);
    expect(g.active).toBe(0);
    expect(g.phase).toBe("roll");
  });

  it("assigns per-player opening cash from an array", () => {
    const g = createGame(1, ["a", "b", "c"], [1000, 2000, 3000])
    expect(g.players.map((p) => p.cash)).toEqual([1000, 2000, 3000])
  })

  it("still accepts a single number for all players", () => {
    const g = createGame(1, ["a", "b"], 5000)
    expect(g.players.map((p) => p.cash)).toEqual([5000, 5000])
  })

  it("throws when the openingCash array length != names", () => {
    expect(() => createGame(1, ["a", "b"], [1000])).toThrow()
  })
});
