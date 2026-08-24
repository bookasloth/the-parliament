import { describe, it, expect } from "vitest";
import { nextRng, rollDie, shuffle } from "@/modules/vyapaar/engine/rng";

describe("vyapaar rng", () => {
  it("is deterministic for a given seed", () => {
    const a = { rng: 12345 };
    const b = { rng: 12345 };
    const seqA = [nextRng(a), nextRng(a), nextRng(a)];
    const seqB = [nextRng(b), nextRng(b), nextRng(b)];
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0,1)", () => {
    const s = { rng: 7 };
    for (let i = 0; i < 1000; i++) {
      const v = nextRng(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("rolls dice in 1..6", () => {
    const s = { rng: 99 };
    for (let i = 0; i < 1000; i++) {
      const d = rollDie(s);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    }
  });

  it("shuffle is deterministic and a permutation", () => {
    const src = [0, 1, 2, 3, 4, 5, 6, 7];
    const s1 = shuffle(src, { rng: 42 });
    const s2 = shuffle(src, { rng: 42 });
    expect(s1).toEqual(s2);
    expect([...s1].sort((a, b) => a - b)).toEqual(src);
    expect(s1).not.toEqual(src); // seed 42 actually reorders
  });
});
