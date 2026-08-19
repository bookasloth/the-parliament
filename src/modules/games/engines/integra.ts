/**
 * Integra — guess the hidden 7-character equation in 6 tries. Positional (tiles)
 * game: each cell is a digit or an operator (+ - * / =). Feedback is Wordle-style
 * per-cell (right symbol right spot / right symbol wrong spot / unused).
 *
 * Pure integer arithmetic parser — no eval(). Order of operations, exact integer
 * division only, leading zeros rejected. Answers are generated deterministically
 * (all valid 7-char equations, seeded-shuffled) so the daily equation is stable
 * and identical for every player. No DB table.
 */

import { seededShuffle } from "@/lib/games/rng";
import { checkGuess } from "@/modules/games/alfazy";
import { type GameEngine } from "./types";

export const EQ_LEN = 7;
export const INTEGRA_MAX_GUESSES = 6;
const SEED = 0x2c9be14d;

/** Evaluate a flat integer expression (+ - * /, precedence, exact division). null = invalid. */
export function evaluate(expr: string): number | null {
  if (!/^[0-9+\-*/]+$/.test(expr)) return null;
  const tokens = expr.match(/\d+|[+\-*/]/g);
  if (!tokens || tokens.join("") !== expr) return null;

  // Must alternate number, op, number, … starting and ending on a number.
  const nums: number[] = [];
  const ops: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i % 2 === 0) {
      if (!/^\d+$/.test(t)) return null;
      if (t.length > 1 && t[0] === "0") return null; // no leading zeros
      nums.push(Number(t));
    } else {
      if (!/^[+\-*/]$/.test(t)) return null;
      ops.push(t);
    }
  }
  if (nums.length !== ops.length + 1) return null;

  // Pass 1: * and /.
  const n = [nums[0]];
  const o: string[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const b = nums[i + 1];
    if (op === "*") n[n.length - 1] *= b;
    else if (op === "/") {
      if (b === 0 || n[n.length - 1] % b !== 0) return null;
      n[n.length - 1] /= b;
    } else {
      o.push(op);
      n.push(b);
    }
  }
  // Pass 2: + and -.
  let acc = n[0];
  for (let i = 0; i < o.length; i++) acc = o[i] === "+" ? acc + n[i + 1] : acc - n[i + 1];
  return acc;
}

/** A well-formed 7-char equation: one '=', integer RHS, LHS evaluates to it. */
export function isValidEquation(guess: string): boolean {
  if (guess.length !== EQ_LEN) return false;
  const parts = guess.split("=");
  if (parts.length !== 2) return false;
  const [lhs, rhs] = parts;
  if (!/^(0|[1-9]\d*)$/.test(rhs)) return false; // RHS is a plain non-negative integer
  const val = evaluate(lhs);
  return val != null && val === Number(rhs);
}

/** Every valid 7-char two-operand equation "a<op>b=c", deterministically ordered. */
function allEquations(): string[] {
  const out = new Set<string>();
  const ops = ["+", "-", "*", "/"];
  for (let a = 1; a <= 99; a++) {
    for (const op of ops) {
      for (let b = 1; b <= 99; b++) {
        const lhs = `${a}${op}${b}`;
        const val = evaluate(lhs);
        if (val == null || val < 0) continue;
        const eq = `${lhs}=${val}`;
        if (eq.length === EQ_LEN) out.add(eq);
      }
    }
  }
  return [...out].sort();
}

const EQUATIONS = seededShuffle(allEquations(), SEED);

/** The answer equation for a 1-based puzzle number. */
export function equationFor(puzzleNo: number): string {
  const i = ((puzzleNo - 1) % EQUATIONS.length + EQUATIONS.length) % EQUATIONS.length;
  return EQUATIONS[i];
}

/** solved → 100 + (6 - guesses)*20 (1 guess = 200 … 6 = 100); failed → 20. */
export function scoreIntegra(solved: boolean, guessesUsed: number): number {
  if (!solved) return 20;
  const g = Math.max(1, Math.min(INTEGRA_MAX_GUESSES, guessesUsed));
  return 100 + (INTEGRA_MAX_GUESSES - g) * 20;
}

export const integraEngine: GameEngine = {
  key: "integra",
  length: EQ_LEN,
  maxGuesses: INTEGRA_MAX_GUESSES,
  render: "tiles",
  keyboard: [
    ["1", "2", "3", "4", "5"].map((k) => ({ key: k })),
    ["6", "7", "8", "9", "0"].map((k) => ({ key: k })),
    ["+", "-", "*", "/", "="].map((k) => ({ key: k })),
    [
      { key: "ENTER", wide: true },
      { key: "DEL", wide: true },
    ],
  ],
  getAnswer: (puzzleNo) => Promise.resolve(equationFor(puzzleNo)),
  isValidGuess: isValidEquation,
  evaluate: (guess, answer) => {
    const tiles = checkGuess(guess, answer);
    return { kind: "tiles", tiles, solved: tiles.every((t) => t === "correct") };
  },
  scorePlay: scoreIntegra,
};
