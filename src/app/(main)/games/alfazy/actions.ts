"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { getDailyPuzzle, checkGuess, gradeGame, isSolved, WORD_LEN, MAX_GUESSES, type Tile } from "@/modules/games/alfazy";
import { alfazyGameId } from "@/modules/games/leaderboard";
import { trophiesForUser, type Trophy } from "@/modules/games/champions";
import { isValidGuess } from "@/lib/games/valid-guesses";

function todayUtcDate(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function normalizeGuess(guess: string): string {
  const g = (guess ?? "").trim().toUpperCase();
  if (!/^[A-Z]+$/.test(g) || g.length !== WORD_LEN) {
    throw new Error(`guess must be ${WORD_LEN} letters`);
  }
  return g;
}

/**
 * Grade one guess against today's answer (answer never leaves the server).
 * Returns { valid: false } for words outside the accepted-guess list instead of
 * throwing, so the client can show "Not in word list" (Next masks thrown errors).
 */
export async function checkGuessAction(
  guess: string,
): Promise<{ valid: boolean; tiles: Tile[]; solved: boolean }> {
  await requireUser();
  const g = normalizeGuess(guess);
  if (!isValidGuess(g)) return { valid: false, tiles: [], solved: false };
  const { word } = await getDailyPuzzle();
  const tiles = checkGuess(g, word);
  return { valid: true, tiles, solved: isSolved(tiles) };
}

/** A user's trophy case (frozen champion rows matching their identity). Public read. */
export async function getTrophiesAction(userId: string): Promise<Trophy[]> {
  return trophiesForUser(userId);
}

/** Whether the current user already played today. */
export async function hasPlayedTodayAction(): Promise<boolean> {
  const user = await requireUser();
  const gameId = await alfazyGameId();
  const existing = await prisma.gameScore.findUnique({
    where: { gameId_userId_puzzleDate: { gameId, userId: user.id, puzzleDate: todayUtcDate() } },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Persist a completed game. Server re-grades the guesses authoritatively (client
 * score is ignored). Unique [game, user, day] guarantees one play per day.
 */
export async function submitResultAction(
  guesses: string[],
): Promise<{ solved: boolean; guessesUsed: number; score: number; alreadyPlayed: boolean }> {
  const user = await requireUser();
  const gameId = await alfazyGameId();
  const puzzleDate = todayUtcDate();

  const normalized = (guesses ?? []).slice(0, MAX_GUESSES).map(normalizeGuess);
  if (normalized.length === 0) throw new Error("no guesses");

  const { word } = await getDailyPuzzle();
  const result = gradeGame(normalized, word);

  try {
    await prisma.gameScore.create({
      data: {
        gameId,
        userId: user.id,
        puzzleDate,
        score: result.score,
        levelReached: result.solved ? result.guessesUsed : null,
        solved: result.solved,
        karmaAwarded: 0, // games never award karma (GAME_KARMA_HARD_CAP)
      },
    });
  } catch (e: unknown) {
    // Unique violation → already played today; don't double-count.
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ...result, alreadyPlayed: true };
    }
    throw e;
  }

  revalidatePath("/games/alfazy");
  revalidatePath("/games/alfazy/leaderboard");
  return { ...result, alreadyPlayed: false };
}
