import { describe, it, expect } from "vitest";
import { scoreDrawing, clampScore, GRID } from "@/modules/games/flag-scoring";

const N = GRID * GRID;

function fill(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const px = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = a;
  }
  return px;
}

describe("scoreDrawing", () => {
  it("identical → 100", () => {
    const flag = fill(0, 154, 228); // brand blue
    expect(scoreDrawing(flag, flag)).toBe(100);
  });

  it("black vs white → ~0", () => {
    expect(scoreDrawing(fill(0, 0, 0), fill(255, 255, 255))).toBe(0);
  });

  it("unpainted (alpha 0) reads as white", () => {
    const blank = fill(0, 0, 0, 0); // fully transparent
    expect(scoreDrawing(blank, fill(255, 255, 255))).toBe(100); // matches white flag
    expect(scoreDrawing(blank, fill(0, 0, 0))).toBe(0); // worst vs black flag
  });

  it("half-right half-wrong → ~50", () => {
    // target all red; drawing red on top half, wrong (cyan) on bottom half
    const target = fill(255, 0, 0);
    const drawn = fill(255, 0, 0);
    for (let i = (N / 2) * 4; i < drawn.length; i += 4) {
      drawn[i] = 0;
      drawn[i + 1] = 255;
      drawn[i + 2] = 255;
    }
    const s = scoreDrawing(drawn, target);
    expect(s).toBeGreaterThan(45);
    expect(s).toBeLessThan(55);
  });

  it("rejects mismatched / empty / non-RGBA input", () => {
    expect(() => scoreDrawing(new Uint8ClampedArray(0), new Uint8ClampedArray(0))).toThrow();
    expect(() => scoreDrawing(fill(0, 0, 0), new Uint8ClampedArray((N - 1) * 4))).toThrow();
    expect(() => scoreDrawing(new Uint8ClampedArray(5), new Uint8ClampedArray(5))).toThrow();
  });
});

describe("clampScore (untrusted client score)", () => {
  it("clamps out-of-range and rounds", () => {
    expect(clampScore(55.6)).toBe(56);
    expect(clampScore(-20)).toBe(0);
    expect(clampScore(9999)).toBe(100);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });
  it("coerces non-finite to 0", () => {
    expect(clampScore(NaN)).toBe(0);
    expect(clampScore(Infinity)).toBe(0);
    expect(clampScore(-Infinity)).toBe(0);
  });
});
