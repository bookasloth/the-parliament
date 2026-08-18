import { describe, it, expect } from "vitest";
import { getEngine } from "@/modules/games/engines";
import { evaluate, isValidEquation, equationFor, scoreIntegra } from "@/modules/games/engines/integra";

const integra = getEngine("integra");

describe("integra engine", () => {
  it("is a 7×6 tiles game", () => {
    expect(integra.length).toBe(7);
    expect(integra.maxGuesses).toBe(6);
    expect(integra.render).toBe("tiles");
  });

  it("evaluate respects order of operations", () => {
    expect(evaluate("1+2*3")).toBe(7);
    expect(evaluate("2*3+4")).toBe(10);
    expect(evaluate("10-3")).toBe(7);
  });

  it("evaluate does integer division only", () => {
    expect(evaluate("12/4")).toBe(3);
    expect(evaluate("12/5")).toBeNull(); // non-exact
    expect(evaluate("5/0")).toBeNull(); // div by zero
  });

  it("evaluate rejects leading zeros and malformed input", () => {
    expect(evaluate("01+2")).toBeNull();
    expect(evaluate("1++2")).toBeNull();
    expect(evaluate("1+")).toBeNull();
    expect(evaluate("")).toBeNull();
  });

  it("validates equations (one =, integer RHS, LHS matches)", () => {
    expect(isValidEquation("1+2*3=7")).toBe(true);
    expect(isValidEquation("12+3=15")).toBe(true);
    expect(isValidEquation("1+2*3=8")).toBe(false); // wrong total
    expect(isValidEquation("10-3=07")).toBe(false); // RHS leading zero
    expect(isValidEquation("1+2=3=4")).toBe(false); // two =
    expect(isValidEquation("1+2=3")).toBe(false); // wrong length
  });

  it("equationFor is a valid 7-char equation, deterministic, and wraps", () => {
    const eq = equationFor(1);
    expect(eq).toHaveLength(7);
    expect(isValidEquation(eq)).toBe(true);
    expect(equationFor(1)).toBe(equationFor(1));
    expect(equationFor(2)).not.toBe(equationFor(1));
  });

  it("grades positionally via evaluate", () => {
    const r = integra.evaluate("1+2*3=7", "1+2*3=7");
    expect(r.solved).toBe(true);
  });

  it("scores: 1 guess = 200, 6 = 100, fail = 20", () => {
    expect(scoreIntegra(true, 1)).toBe(200);
    expect(scoreIntegra(true, 6)).toBe(100);
    expect(scoreIntegra(false, 6)).toBe(20);
  });
});
