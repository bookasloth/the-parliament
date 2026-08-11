"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { getDailyPuzzle, checkGuess, gradeGame, isSolved, WORD_LEN, MAX_GUESSES, type Tile } from "@/modules/games/alfazy";
import { alfazyGameId, ALFAZY_CACHE_TAG } from "@/modules/games/leaderboard";
import { trophiesForUser, type Trophy } from "@/modules/games/champions";
import { isValidGuess } from "@/lib/games/valid-guesses";
import { nudgeVerdict, NUDGE_COOLDOWN_MS, NUDGE_MESSAGE, type NudgeVerdict } from "@/modules/games/nudge";
import { findOrCreateConversation, sendMessage } from "@/modules/messaging/service";

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

  revalidateTag(ALFAZY_CACHE_TAG, "max"); // refresh cached leaderboards with your new score
  revalidatePath("/games/alfazy");
  return { ...result, alreadyPlayed: false };
}

/**
 * Nudge a connection to come play Alfazy. Sends a DM and opens the conversation
 * (no notification-bell row — nudges land in the recipient's inbox). Guarded: no
 * self-nudge, connections only (follow in either direction), one nudge per
 * person per day. Rate-limit reuses the nudge message itself (same body, same
 * sender, within the cooldown) so there's no extra table.
 */
export async function nudgePlayerAction(targetUserId: string): Promise<NudgeVerdict> {
  const actor = await requireUser();
  const targetId = (targetUserId ?? "").trim();
  if (!targetId) return { ok: false, reason: "self" };

  const connection = await prisma.follow.findFirst({
    where: {
      OR: [
        { followerId: actor.id, followingId: targetId },
        { followerId: targetId, followingId: actor.id },
      ],
    },
    select: { id: true },
  });
  // Gate connection/self BEFORE touching the conversation (findOrCreateConversation
  // throws for non-connections; we want a clean verdict instead).
  if (actor.id === targetId) return { ok: false, reason: "self" };
  if (!connection) return { ok: false, reason: "not_connected" };

  const conversation = await findOrCreateConversation(actor.id, targetId);

  const cutoff = new Date(Date.now() - NUDGE_COOLDOWN_MS);
  const recent = await prisma.message.findFirst({
    where: {
      conversationId: conversation.id,
      senderId: actor.id,
      body: NUDGE_MESSAGE,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  });

  const verdict = nudgeVerdict({
    actorId: actor.id,
    targetId,
    isConnection: !!connection,
    nudgedRecently: !!recent,
  });
  if (!verdict.ok) return verdict;

  await sendMessage(actor.id, conversation.id, { body: NUDGE_MESSAGE });

  return { ok: true };
}
