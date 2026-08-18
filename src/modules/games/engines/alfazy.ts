/** Alfazy engine — adapts the existing Alfazy logic to the GameEngine contract. */

import { isValidGuess as isValidAlfazyGuess } from "@/lib/games/valid-guesses";
import {
  WORD_LEN,
  MAX_GUESSES,
  checkGuess,
  scorePlay,
  wordForPuzzleNo,
} from "@/modules/games/alfazy";
import { type GameEngine, emojiGrid } from "./types";

const LETTER_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export const alfazyEngine: GameEngine = {
  key: "alfazy",
  length: WORD_LEN,
  maxGuesses: MAX_GUESSES,
  keyboard: [
    LETTER_ROWS[0].split("").map((k) => ({ key: k })),
    LETTER_ROWS[1].split("").map((k) => ({ key: k })),
    [
      { key: "ENTER", wide: true },
      ...LETTER_ROWS[2].split("").map((k) => ({ key: k })),
      { key: "DEL", wide: true },
    ],
  ],
  getAnswer: (puzzleNo) => wordForPuzzleNo(puzzleNo),
  isValidGuess: (guess) => isValidAlfazyGuess(guess.toUpperCase()),
  grade: (guess, answer) => checkGuess(guess, answer),
  scorePlay,
  shareGrid: emojiGrid,
};
