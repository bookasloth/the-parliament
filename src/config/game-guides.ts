/**
 * Per-game "How to play" content for the instruction rail. Client-safe data only
 * (no engine/prisma imports) so it can render in the client-side GameGuideRail.
 */

import type { GameKey } from "./games";

export type TileState = "correct" | "present" | "absent";

/** Worked example for a positional (tiles) game. */
export interface TilesExample {
  kind: "tiles";
  cells: { char: string; state: TileState }[];
  note: string;
}

/** Worked example for a count (hits/blows) game. */
export interface CountExample {
  kind: "count";
  secret: string;
  guess: string;
  hits: number;
  blows: number;
  note: string;
}

export interface Guide {
  example: TilesExample | CountExample;
  /** Colour/feedback legend. `swatch` maps to a tile state or hit/blow chip. */
  legend: { swatch: TileState | "hit" | "blow"; label: string }[];
  rules: string[];
}

export const GAME_GUIDES: Record<GameKey, Guide> = {
  alfazy: {
    example: {
      kind: "tiles",
      cells: [
        { char: "S", state: "absent" },
        { char: "H", state: "absent" },
        { char: "A", state: "present" },
        { char: "R", state: "absent" },
        { char: "E", state: "correct" },
      ],
      note: "A is in the word but in the wrong spot. E is in the right spot. S, H and R aren't in the word.",
    },
    legend: [
      { swatch: "correct", label: "Right letter, right spot" },
      { swatch: "present", label: "Right letter, wrong spot" },
      { swatch: "absent", label: "Not in the word" },
    ],
    rules: [
      "Guess the hidden 5-letter word.",
      "You get 6 tries.",
      "A new word every day — fewer guesses scores higher.",
    ],
  },
  hit_and_blow: {
    example: {
      kind: "count",
      secret: "1357",
      guess: "1234",
      hits: 1,
      blows: 1,
      note: "The 1 is a Hit — right digit, right spot. The 3 is a Blow — right digit, wrong spot. The 2 and 4 aren't in the code.",
    },
    legend: [
      { swatch: "hit", label: "Right digit, right spot" },
      { swatch: "blow", label: "Right digit, wrong spot" },
    ],
    rules: [
      "Crack the secret 4-digit code.",
      "All four digits are different, and it never starts with 0.",
      "You get 9 tries.",
    ],
  },
  integra: {
    example: {
      kind: "tiles",
      cells: [
        { char: "1", state: "correct" },
        { char: "0", state: "absent" },
        { char: "+", state: "present" },
        { char: "2", state: "absent" },
        { char: "=", state: "correct" },
        { char: "1", state: "absent" },
        { char: "2", state: "absent" },
      ],
      note: "The first 1 and the = are in the right spot. The + belongs in the equation but a different spot. The rest don't appear.",
    },
    legend: [
      { swatch: "correct", label: "Right symbol, right spot" },
      { swatch: "present", label: "Right symbol, wrong spot" },
      { swatch: "absent", label: "Not in the equation" },
    ],
    rules: [
      "Guess the hidden 7-character equation.",
      "Exactly one =, and only a number on the right of it.",
      "Order of operations applies (× and ÷ before + and −); no leading zeros.",
      "You get 6 tries.",
    ],
  },
};
