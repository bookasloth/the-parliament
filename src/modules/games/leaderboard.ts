/**
 * Alfazy leaderboards. One shape: SUM(score) over a window, grouped by scope,
 * ranked. Pure aggregate/rank functions (tested on in-memory rows) are separated
 * from the Prisma fetch so the grouping logic needs no DB.
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { type GameKey, launchDate } from "@/config/games";
import { Period, windowFor, anchorFor, priorAnchor } from "./periods";
import { type Scope, SCOPES } from "./format";

export { type Scope, SCOPES }; // re-export for existing importers

/** Per-game leaderboard cache tag; busted when a new play for that game is saved. */
export function cacheTag(key: GameKey): string {
  return `game-leaderboard:${key}`;
}

/** @deprecated use cacheTag("alfazy"). Kept for the existing cron/actions. */
export const ALFAZY_CACHE_TAG = cacheTag("alfazy");

/** A single play, flattened with the player's house/batch identity. */
export interface ScoreRow {
  userId: string;
  score: number;
  guesses: number | null; // guesses used if solved, else null
  solved: boolean;
  playedAt: Date;
  houseId: string | null;
  batchId: string | null;
  userLabel: string;
  houseLabel: string | null;
  houseColor: string | null;
  batchLabel: string | null;
  avatarUrl: string | null;
}

export interface LeaderEntry {
  rank: number;
  key: string; // userId | houseId | batchId
  label: string;
  color: string | null; // house colour when scope=house
  total: number;
  players: number; // distinct players contributing
  bestGuesses: number | null; // fewest guesses to solve, in window
  avatarUrl: string | null; // individual scope only; null for house/batch
}

function keyFor(row: ScoreRow, scope: Scope): { key: string; label: string; color: string | null } | null {
  switch (scope) {
    case "individual":
      return { key: row.userId, label: row.userLabel, color: null };
    case "house":
      return row.houseId ? { key: row.houseId, label: row.houseLabel ?? "—", color: row.houseColor } : null;
    case "batch":
      return row.batchId ? { key: row.batchId, label: row.batchLabel ?? "—", color: null } : null;
  }
}

/** Sum scores by scope key. Returns unranked totals. Pure. */
export function aggregate(rows: ScoreRow[], scope: Scope): Omit<LeaderEntry, "rank">[] {
  const acc = new Map<
    string,
    { label: string; color: string | null; avatarUrl: string | null; total: number; players: Set<string>; best: number | null; guessSum: number; lastPlay: number }
  >();
  for (const row of rows) {
    const k = keyFor(row, scope);
    if (!k) continue;
    const cur =
      acc.get(k.key) ??
      { label: k.label, color: k.color, avatarUrl: scope === "individual" ? row.avatarUrl : null, total: 0, players: new Set<string>(), best: null as number | null, guessSum: 0, lastPlay: 0 };
    cur.total += row.score;
    cur.players.add(row.userId);
    if (row.solved && row.guesses != null) {
      cur.best = cur.best == null ? row.guesses : Math.min(cur.best, row.guesses);
      cur.guessSum += row.guesses;
    } else {
      cur.guessSum += 7; // failed play counts as worse than any solve for tie-break
    }
    cur.lastPlay = Math.max(cur.lastPlay, row.playedAt.getTime());
    acc.set(k.key, cur);
  }
  return [...acc.entries()].map(([key, v]) => ({
    key,
    label: v.label,
    color: v.color,
    avatarUrl: v.avatarUrl,
    total: v.total,
    players: v.players.size,
    bestGuesses: v.best,
    // carried privately for ranking via symbol-free extra props
    _guessSum: v.guessSum,
    _lastPlay: v.lastPlay,
  })) as unknown as Omit<LeaderEntry, "rank">[];
}

/**
 * Rank aggregated entries. Competition ranking (1,1,3): ties share a rank.
 * Order: total desc → fewer total guesses → earlier last-play → key.
 */
export function rankEntries(entries: Omit<LeaderEntry, "rank">[]): LeaderEntry[] {
  const rows = entries as unknown as (Omit<LeaderEntry, "rank"> & { _guessSum: number; _lastPlay: number })[];
  const sorted = [...rows].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a._guessSum !== b._guessSum) return a._guessSum - b._guessSum;
    if (a._lastPlay !== b._lastPlay) return a._lastPlay - b._lastPlay;
    return a.key.localeCompare(b.key);
  });
  const out: LeaderEntry[] = [];
  let rank = 0;
  let seen = 0;
  let prevKeyTuple: string | null = null;
  for (const r of sorted) {
    seen++;
    const tuple = `${r.total}|${r._guessSum}`; // tie iff same total AND same guess-sum
    if (tuple !== prevKeyTuple) rank = seen;
    prevKeyTuple = tuple;
    out.push({
      rank,
      key: r.key,
      label: r.label,
      color: r.color,
      avatarUrl: r.avatarUrl,
      total: r.total,
      players: r.players,
      bestGuesses: r.bestGuesses,
    });
  }
  return out;
}

const DAY_MS = 86_400_000;
const utcDayKey = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Consecutive daily-play streak ending today — or yesterday, if today isn't
 * played yet (the streak stays alive until the day rolls over). Pure. `now` and
 * every day in `playedDays` are compared in UTC.
 */
export function streakLength(playedDays: Set<string>, now: Date): number {
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!playedDays.has(utcDayKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!playedDays.has(utcDayKey(cursor))) return 0;
  }
  let n = 0;
  while (playedDays.has(utcDayKey(cursor))) {
    n++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return n;
}

/**
 * Given the user's played UTC-day keys and today, did a streak just break as of
 * today? Returns the length of the streak that ended (>0), or null if there's no
 * break — i.e. they have no history, or they played yesterday (streak continuous),
 * or today's play is their streak continuing. Pure.
 */
export function brokenStreakLength(playedDays: Set<string>, today: Date): number | null {
  if (playedDays.size === 0) return null;
  const yesterday = utcDayKey(new Date(today.getTime() - DAY_MS));
  const todayKey = utcDayKey(today);
  if (playedDays.has(yesterday) || playedDays.has(todayKey)) return null; // continuous
  const lastKey = [...playedDays].sort().pop()!; // most recent prior play
  return streakLength(playedDays, new Date(`${lastKey}T00:00:00Z`)) || null;
}

/** The current user's daily streak for a game. */
export async function currentStreak(key: GameKey, userId: string): Promise<number> {
  const id = await gameId(key);
  const rows = await prisma.gameScore.findMany({
    where: { gameId: id, userId },
    select: { puzzleDate: true },
    orderBy: { puzzleDate: "desc" },
    take: 400,
  });
  return streakLength(new Set(rows.map((r) => utcDayKey(r.puzzleDate))), new Date());
}

const gameIdCache = new Map<GameKey, string>();
/** The game row id for a key (cached per key). */
export async function gameId(key: GameKey): Promise<string> {
  const hit = gameIdCache.get(key);
  if (hit) return hit;
  const game = await prisma.game.findFirst({ where: { key }, select: { id: true } });
  if (!game) throw new Error(`game row missing for "${key}" — seed it`);
  gameIdCache.set(key, game.id);
  return game.id;
}

/** @deprecated use gameId("alfazy"). Kept for existing Alfazy pages. */
export function alfazyGameId(): Promise<string> {
  return gameId("alfazy");
}

/** Fetch flattened score rows for a window. */
export async function fetchWindowScores(gameId: string, start: Date, end: Date): Promise<ScoreRow[]> {
  const scores = await prisma.gameScore.findMany({
    where: { gameId, playedAt: { gte: start, lt: end } },
    select: {
      userId: true,
      score: true,
      levelReached: true,
      solved: true,
      playedAt: true,
      user: {
        select: {
          displayName: true,
          legalName: true,
          profile: {
            select: {
              houseId: true,
              batchId: true,
              photoUrl: true,
              house: { select: { name: true, colorHex: true } },
              batch: { select: { label: true } },
            },
          },
        },
      },
    },
  });
  return scores.map((s) => ({
    userId: s.userId,
    score: s.score,
    guesses: s.solved ? s.levelReached : null,
    solved: s.solved,
    playedAt: s.playedAt,
    houseId: s.user.profile?.houseId ?? null,
    batchId: s.user.profile?.batchId ?? null,
    userLabel: s.user.displayName ?? s.user.legalName ?? "Alumnus",
    houseLabel: s.user.profile?.house?.name ?? null,
    houseColor: s.user.profile?.house?.colorHex ?? null,
    batchLabel: s.user.profile?.batch?.label ?? null,
    avatarUrl: s.user.profile?.photoUrl ?? null,
  }));
}

/** The one leaderboard call. anchor defaults to the period containing now. */
export async function leaderboard(
  key: GameKey,
  scope: Scope,
  period: Period,
  anchor?: string,
  now: Date = new Date(),
): Promise<{ anchor: string; entries: LeaderEntry[] }> {
  const id = await gameId(key);
  const launch = launchDate(key);
  const resolvedAnchor = anchor ?? anchorFor(period, now);
  const { start, end } = windowFor(period, resolvedAnchor, launch);
  const rows = await fetchWindowScores(id, start, end);
  return { anchor: resolvedAnchor, entries: rankEntries(aggregate(rows, scope)) };
}

export type Movement = "up" | "down" | "same" | "new";

/** Rank change for each key vs the previous period window. Pure. */
export function movementMap(current: LeaderEntry[], prior: LeaderEntry[]): Map<string, Movement> {
  const priorRank = new Map(prior.map((e) => [e.key, e.rank]));
  const out = new Map<string, Movement>();
  for (const e of current) {
    const p = priorRank.get(e.key);
    if (p == null) out.set(e.key, "new");
    else if (e.rank < p) out.set(e.key, "up");
    else if (e.rank > p) out.set(e.key, "down");
    else out.set(e.key, "same");
  }
  return out;
}

// ── Cached variants ──────────────────────────────────────────────────────────
// The heavy work (window scan + aggregate) is memoized in Next's Data Cache,
// keyed by (scope, period, resolvedAnchor) with a 60s revalidate and a shared
// tag busted on each new play. A warm leaderboard page issues ZERO DB queries,
// so route-to-route nav (with <Link> prefetch) feels instant. Anchor is resolved
// to a string BEFORE caching so keys are stable and inputs stay serializable
// (LeaderEntry is all primitives — no Date crosses the cache boundary).

// One cached function per game key (memoized), so each game carries its own
// cache tag — revalidateTag(cacheTag(key)) busts only that game's boards.
const cachedEntriesByKey = new Map<
  GameKey,
  (scope: Scope, period: Period, anchor: string) => Promise<LeaderEntry[]>
>();

function cachedEntriesFor(key: GameKey) {
  let fn = cachedEntriesByKey.get(key);
  if (!fn) {
    fn = unstable_cache(
      async (scope: Scope, period: Period, anchor: string): Promise<LeaderEntry[]> => {
        const { entries } = await leaderboard(key, scope, period, anchor);
        return entries;
      },
      ["game-leaderboard-entries", key],
      { revalidate: 60, tags: [cacheTag(key)] },
    );
    cachedEntriesByKey.set(key, fn);
  }
  return fn;
}

/** Cached leaderboard for a resolved-or-current window. */
export async function leaderboardCached(
  key: GameKey,
  scope: Scope,
  period: Period,
  anchor?: string,
): Promise<{ anchor: string; entries: LeaderEntry[] }> {
  const resolved = anchor ?? anchorFor(period, new Date());
  return { anchor: resolved, entries: await cachedEntriesFor(key)(scope, period, resolved) };
}

/** Cached leaderboard + movement (two cached reads, no DB when warm). */
export async function leaderboardWithMovementCached(
  key: GameKey,
  scope: Scope,
  period: Period,
  anchor?: string,
): Promise<{ anchor: string; entries: LeaderEntry[]; movement: Map<string, Movement> }> {
  const cur = await leaderboardCached(key, scope, period, anchor);
  if (period === "all") return { ...cur, movement: new Map() };
  const prevA = priorAnchor(period, cur.anchor, launchDate(key));
  if (!prevA) return { ...cur, movement: new Map() };
  const prev = await leaderboardCached(key, scope, period, prevA);
  return { ...cur, movement: movementMap(cur.entries, prev.entries) };
}
