/**
 * Alfazy champions — freeze period winners into game_champions, and derive a
 * user's trophy case from those frozen rows. Ties = co-champions (all rank-1
 * rows written). Freezing is idempotent: a re-run replaces that anchor's rows.
 */

import { prisma } from "@/lib/prisma";
import { type GameKey, DAILY_GAMES, launchDate } from "@/config/games";
import { Period, anchorFor, justClosedAnchor, windowFor } from "./periods";
import { SCOPES, Scope, gameId, leaderboard } from "./leaderboard";

const FROZEN_PERIODS: Period[] = ["daily", "weekly", "monthly", "yearly"];
const DAY_MS = 86_400_000;

/** Freeze one game's (period, anchor) across all 3 scopes. Replaces existing rows. */
export async function freezeAnchor(key: GameKey, period: Period, anchor: string): Promise<number> {
  const id = await gameId(key);
  let written = 0;
  for (const scope of SCOPES) {
    const { entries } = await leaderboard(key, scope, period, anchor);
    const winners = entries.filter((e) => e.rank === 1 && e.total > 0);
    await prisma.$transaction([
      prisma.gameChampion.deleteMany({ where: { gameId: id, scope, period, anchor } }),
      ...(winners.length
        ? [
            prisma.gameChampion.createMany({
              data: winners.map((w) => ({
                gameId: id,
                scope,
                period,
                anchor,
                winnerKey: w.key,
                winnerLabel: w.label,
                totalScore: w.total,
              })),
            }),
          ]
        : []),
    ]);
    written += winners.length;
  }
  return written;
}

/** Cron entry: freeze every period that just closed as of `now`, for every live daily game. */
export async function closeJustEnded(
  now: Date = new Date(),
): Promise<{ key: GameKey; period: Period; anchor: string }[]> {
  const done: { key: GameKey; period: Period; anchor: string }[] = [];
  for (const game of DAILY_GAMES) {
    for (const period of FROZEN_PERIODS) {
      const anchor = justClosedAnchor(period, now, launchDate(game.key));
      if (!anchor) continue;
      await freezeAnchor(game.key, period, anchor);
      done.push({ key: game.key, period, anchor });
    }
  }
  return done;
}

/** Backfill every closed anchor for one game from its launch to now (seed / catch-up). */
export async function backfillChampions(key: GameKey, now: Date = new Date()): Promise<number> {
  const launch = launchDate(key);
  let total = 0;
  for (const period of FROZEN_PERIODS) {
    const seen = new Set<string>();
    for (let t = launch.getTime(); t < now.getTime(); t += DAY_MS) {
      const d = new Date(t);
      const anchor = anchorFor(period, d);
      if (seen.has(anchor)) continue;
      const { end } = windowFor(period, anchor, launch);
      if (end.getTime() > now.getTime()) continue; // period not closed yet
      seen.add(anchor);
      total += await freezeAnchor(key, period, anchor);
    }
  }
  return total;
}

export interface Trophy {
  scope: Scope;
  period: Period;
  anchor: string;
  label: string; // winnerLabel (house/batch name or the user's own name)
  totalScore: number;
  decidedAt: Date;
}

/**
 * A user's trophies = frozen champion rows matching their identity:
 * individual→userId, house→their houseId, batch→their batchId. House/batch wins
 * are shared by all current members. Newest first.
 */
export async function trophiesForUser(userId: string, gameId?: string): Promise<Trophy[]> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { houseId: true, batchId: true },
  });
  const keys: string[] = [userId];
  if (profile?.houseId) keys.push(profile.houseId);
  if (profile?.batchId) keys.push(profile.batchId);

  const rows = await prisma.gameChampion.findMany({
    where: {
      ...(gameId ? { gameId } : {}), // scope to one game when given; else all games (profile trophy case)
      winnerKey: { in: keys },
      OR: [
        { scope: "individual", winnerKey: userId },
        ...(profile?.houseId ? [{ scope: "house", winnerKey: profile.houseId }] : []),
        ...(profile?.batchId ? [{ scope: "batch", winnerKey: profile.batchId }] : []),
      ],
    },
    orderBy: { decidedAt: "desc" },
  });
  return rows.map((r) => ({
    scope: r.scope as Scope,
    period: r.period as Period,
    anchor: r.anchor,
    label: r.winnerLabel,
    totalScore: r.totalScore,
    decidedAt: r.decidedAt,
  }));
}
