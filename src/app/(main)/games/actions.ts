"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { type GameKey, gameByKey, launchDate } from "@/config/games";
import { getEngine, runGame, type GuessResult } from "@/modules/games/engines";
import { puzzleNumber } from "@/modules/games/periods";
import { gameId, cacheTag, brokenStreakLength } from "@/modules/games/leaderboard";
import { emitGameEvent } from "@/modules/games/analytics";
import { trophiesForUser, type Trophy } from "@/modules/games/champions";
import {
  nudgeVerdict,
  NUDGE_COOLDOWN_MS,
  NUDGE_MESSAGE,
  type NudgeVerdict,
} from "@/modules/games/nudge";
import { findOrCreateConversation, sendMessage } from "@/modules/messaging/service";

/** UTC start-of-today (the puzzle-date key: one play per user per day). */
function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function assertLiveKey(key: string): GameKey {
  const cfg = gameByKey(key);
  if (!cfg || cfg.status !== "live") throw new Error(`not a live game: ${key}`);
  return cfg.key;
}

/** Normalize + length-check a guess for a game; charset validity is the engine's job. */
function normalize(key: GameKey, guess: string): string {
  const g = (guess ?? "").trim().toUpperCase();
  if (g.length !== getEngine(key).length) throw new Error(`guess must be ${getEngine(key).length} chars`);
  return g;
}

async function answerForToday(key: GameKey): Promise<string> {
  const puzzleNo = puzzleNumber(todayUtc(), launchDate(key));
  return getEngine(key).getAnswer(puzzleNo);
}

/** Fired on board mount — records a start event for DAU. */
export async function startGameAction(key: string): Promise<void> {
  const k = assertLiveKey(key);
  const user = await requireUser();
  const puzzleNo = puzzleNumber(todayUtc(), launchDate(k));
  await emitGameEvent(user.id, k, "game_started", { puzzleNo });
}

/**
 * Grade one guess against today's answer (answer never leaves the server).
 * Returns { valid: false } for illegal guesses instead of throwing.
 */
export async function checkGuessAction(
  key: string,
  guess: string,
  guessIndex = 0,
): Promise<{ valid: boolean; result: GuessResult | null }> {
  const k = assertLiveKey(key);
  const user = await requireUser();
  const engine = getEngine(k);
  const g = normalize(k, guess);
  if (!engine.isValidGuess(g)) return { valid: false, result: null };
  const answer = await answerForToday(k);
  const result = engine.evaluate(g, answer);
  await emitGameEvent(user.id, k, "guess_submitted", {
    puzzleNo: puzzleNumber(todayUtc(), launchDate(k)),
    guessIndex,
    valid: true,
  });
  return { valid: true, result };
}

/** A user's trophy case (frozen champion rows matching their identity). Public read. */
export async function getTrophiesAction(userId: string): Promise<Trophy[]> {
  return trophiesForUser(userId);
}

/** Whether the current user already played this game today. */
export async function hasPlayedTodayAction(key: string): Promise<boolean> {
  const k = assertLiveKey(key);
  const user = await requireUser();
  const id = await gameId(k);
  const existing = await prisma.gameScore.findUnique({
    where: { gameId_userId_puzzleDate: { gameId: id, userId: user.id, puzzleDate: todayUtc() } },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Persist a completed game. Server re-grades authoritatively (client score
 * ignored). Unique [game, user, day] guarantees one play per day. Emits
 * game_completed, and streak_lost when the player is returning after a gap.
 */
export async function submitResultAction(
  key: string,
  guesses: string[],
): Promise<{ solved: boolean; guessesUsed: number; score: number; alreadyPlayed: boolean }> {
  const k = assertLiveKey(key);
  const user = await requireUser();
  const engine = getEngine(k);
  const id = await gameId(k);
  const puzzleDate = todayUtc();
  const puzzleNo = puzzleNumber(puzzleDate, launchDate(k));

  const normalized = (guesses ?? []).slice(0, engine.maxGuesses).map((g) => normalize(k, g));
  if (normalized.length === 0) throw new Error("no guesses");

  const answer = await answerForToday(k);
  const result = runGame(engine, normalized, answer);

  // Streak-loss is detected from the plays that existed BEFORE today's row.
  const priorDays = await prisma.gameScore.findMany({
    where: { gameId: id, userId: user.id, puzzleDate: { lt: puzzleDate } },
    select: { puzzleDate: true },
    orderBy: { puzzleDate: "desc" },
    take: 400,
  });

  try {
    await prisma.gameScore.create({
      data: {
        gameId: id,
        userId: user.id,
        puzzleDate,
        score: result.score,
        levelReached: result.solved ? result.guessesUsed : null,
        solved: result.solved,
        karmaAwarded: 0, // games never award karma (GAME_KARMA_HARD_CAP)
      },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return { solved: result.solved, guessesUsed: result.guessesUsed, score: result.score, alreadyPlayed: true };
    }
    throw e;
  }

  const lostStreak = brokenStreakLength(new Set(priorDays.map((r) => dayKey(r.puzzleDate))), puzzleDate);
  if (lostStreak != null) await emitGameEvent(user.id, k, "streak_lost", { previousStreak: lostStreak });
  await emitGameEvent(user.id, k, "game_completed", {
    puzzleNo,
    solved: result.solved,
    guessesUsed: result.guessesUsed,
    score: result.score,
  });

  revalidateTag(cacheTag(k), "max");
  revalidatePath(`/games/${gameByKey(k)!.slug}`);
  return { solved: result.solved, guessesUsed: result.guessesUsed, score: result.score, alreadyPlayed: false };
}

/** Client reports a successful share (for the virality metric). */
export async function reportShareAction(key: string, target: string): Promise<void> {
  const k = assertLiveKey(key);
  const user = await requireUser();
  await emitGameEvent(user.id, k, "shared_result", {
    puzzleNo: puzzleNumber(todayUtc(), launchDate(k)),
    target,
  });
}

/**
 * Nudge a connection to come play. Sends a DM and opens the conversation.
 * Guarded: no self-nudge, connections only, one nudge per person per day.
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
  if (actor.id === targetId) return { ok: false, reason: "self" };
  if (!connection) return { ok: false, reason: "not_connected" };

  const conversation = await findOrCreateConversation(actor.id, targetId);
  const cutoff = new Date(Date.now() - NUDGE_COOLDOWN_MS);
  const recent = await prisma.message.findFirst({
    where: { conversationId: conversation.id, senderId: actor.id, body: NUDGE_MESSAGE, createdAt: { gte: cutoff } },
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
