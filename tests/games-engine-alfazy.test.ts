import { describe, it, expect } from "vitest";
import { getEngine, hasEngine } from "@/modules/games/engines";
import { emojiGrid, type Tile } from "@/modules/games/engines/types";

const alfazy = getEngine("alfazy");

describe("alfazy engine (via GameEngine contract)", () => {
  it("is registered; games without an engine are not", () => {
    expect(hasEngine("alfazy")).toBe(true);
    expect(hasEngine("integra")).toBe(false); // no engine yet (phase 3)
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
    const r = alfazy.evaluate("LLAMA", "ALLOY");
    expect(r.kind).toBe("tiles");
    if (r.kind !== "tiles") throw new Error("expected tiles");
    expect(r.tiles).toEqual<Tile[]>(["present", "correct", "present", "absent", "absent"]);
    expect(r.solved).toBe(false);
  });

  it("evaluate marks a full match solved", () => {
    const r = alfazy.evaluate("ALLOY", "ALLOY");
    expect(r.solved).toBe(true);
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
