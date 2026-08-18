import { describe, it, expect } from "vitest";
import { getEngine, hasEngine } from "@/modules/games/engines";
import { emojiGrid, type Tile } from "@/modules/games/engines/types";

const alfazy = getEngine("alfazy");

describe("alfazy engine (via GameEngine contract)", () => {
  it("is registered; coming_soon games are not", () => {
    expect(hasEngine("alfazy")).toBe(true);
    expect(hasEngine("hit_and_blow")).toBe(false);
    expect(() => getEngine("integra")).toThrow();
  });

  it("exposes 5×6 board + keyboard with ENTER/DEL", () => {
    expect(alfazy.length).toBe(5);
    expect(alfazy.maxGuesses).toBe(6);
    const keys = alfazy.keyboard.flat().map((k) => k.key);
    expect(keys).toContain("ENTER");
    expect(keys).toContain("DEL");
    expect(keys.filter((k) => k.length === 1)).toHaveLength(26); // full alphabet
  });

  it("grades duplicate letters correctly (green consumes slot before yellow)", () => {
    // answer ALLOY, guess LLAMA: positions L,L,A,M,A
    const tiles = alfazy.grade("LLAMA", "ALLOY");
    expect(tiles).toEqual<Tile[]>(["present", "correct", "present", "absent", "absent"]);
  });

  it("scores: 1 guess = 200, 6 = 100, fail = 20", () => {
    expect(alfazy.scorePlay(true, 1)).toBe(200);
    expect(alfazy.scorePlay(true, 6)).toBe(100);
    expect(alfazy.scorePlay(false, 6)).toBe(20);
  });

  it("rejects non-dictionary guesses", () => {
    expect(alfazy.isValidGuess("ZZZZZ")).toBe(false);
  });

  it("shareGrid renders emoji rows", () => {
    const grid = emojiGrid([
      ["correct", "present", "absent", "absent", "absent"],
    ]);
    expect(grid).toBe("🟩🟨⬜⬜⬜");
  });
});
