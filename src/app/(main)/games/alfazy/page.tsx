import Link from "next/link";
import { Type, Trophy, Flame, Play, CheckCircle2, ChevronRight } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { getDailyPuzzle } from "@/modules/games/alfazy";
import { leaderboardCached, alfazyGameId, currentStreak } from "@/modules/games/leaderboard";
import { trophiesForUser } from "@/modules/games/champions";
import { getFollowData } from "@/modules/connections/service";
import { env } from "@/config/env";
import CountUp from "@/components/games/CountUp";
import NudgePanel from "@/components/games/NudgePanel";
import ShareResult from "@/components/games/ShareResult";

export const metadata = { title: "Alfazy · The Parliament" };
export const dynamic = "force-dynamic";

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function AlfazyHubPage() {
  const user = await requireUser();
  const gameId = await alfazyGameId();
  const { puzzleNo } = await getDailyPuzzle();

  const [playedToday, gamesPlayed, board, trophies, follow, streak] = await Promise.all([
    prisma.gameScore.findUnique({
      where: { gameId_userId_puzzleDate: { gameId, userId: user.id, puzzleDate: todayUtc() } },
      select: { score: true, solved: true, levelReached: true },
    }),
    prisma.gameScore.count({ where: { gameId, userId: user.id } }),
    leaderboardCached("individual", "daily"),
    trophiesForUser(user.id),
    getFollowData(user.id),
    currentStreak(user.id),
  ]);

  const nudgeTargets = follow.following.map((c) => ({
    userId: c.userId ?? c.id,
    name: c.name,
    avatar: c.avatar,
    headline: c.headline,
  }));

  const top5 = board.entries.slice(0, 5);
  const myRank = board.entries.find((e) => e.key === user.id)?.rank ?? null;
  const totalPlayers = board.entries.length;
  const topPct = myRank && totalPlayers ? Math.max(1, Math.round((myRank / totalPlayers) * 100)) : null;
  const shareText = playedToday
    ? `Alfazy #${String(puzzleNo).padStart(3, "0")} — ${
        playedToday.solved ? `solved ${playedToday.levelReached}/6` : "unsolved"
      } · ${playedToday.score} pts${streak > 1 ? ` · ${streak}-day streak 🔥` : ""}\nPlay: ${env.authUrl}/games/alfazy`
    : "";

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
          <Type className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Alfazy</h1>
          <p className="text-[13.5px] text-gray-500">Puzzle #{String(puzzleNo).padStart(3, "0")} · a new word every day</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Play card */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-700 p-6 text-white lg:row-span-1">
          <h2 className="font-heading text-xl font-bold">Play Alfazy</h2>
          {playedToday ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-white/15 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-5 w-5" /> Done for today
                </div>
                <p className="mt-1 text-[13px] text-white/85">
                  {playedToday.solved ? `Solved in ${playedToday.levelReached}/6` : "Not solved"} · {playedToday.score} pts
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {streak > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold">
                      <Flame className="h-3.5 w-3.5" /> {streak}-day streak
                    </span>
                  )}
                  {topPct != null && (
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold">
                      Top {topPct}% today
                    </span>
                  )}
                </div>
              </div>
              <ShareResult text={shareText} className="w-full bg-white text-brand hover:bg-white/90" />
            </div>
          ) : (
            <>
              <Link
                href="/games/alfazy/play"
                className="mt-4 flex items-center justify-between rounded-xl bg-white/15 p-4 transition-colors hover:bg-white/25"
              >
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    <Play className="h-5 w-5" /> Daily Challenge
                  </span>
                  <span className="mt-0.5 block text-[13px] text-white/85">Solve today&apos;s Alfazy and climb the ranks</span>
                </span>
                <ChevronRight className="h-5 w-5" />
              </Link>
            </>
          )}
          <Link
            href="/games/alfazy/leaderboard/individual/daily"
            className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-white/90 hover:text-white"
          >
            <Trophy className="h-4 w-4" /> Leaderboards &amp; champions
          </Link>
        </section>

        {/* Today's leaderboard */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-gray-900">Today&apos;s Leaderboard</h2>
          {top5.length === 0 ? (
            <p className="mt-4 text-[13.5px] text-gray-500">No plays yet today — be the first!</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {top5.map((e) => (
                <li key={e.key} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-bold ${
                      e.rank === 1 ? "bg-amber-100 text-amber-700" : e.rank === 2 ? "bg-gray-200 text-gray-700" : e.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {e.rank}
                  </span>
                  <span className={`flex-1 truncate text-[14px] ${e.key === user.id ? "font-bold text-brand" : "font-medium text-gray-800"}`}>
                    {e.key === user.id ? "You" : e.label}
                  </span>
                  <span className="text-[13px] font-semibold text-gray-500">{e.total} pts</span>
                </li>
              ))}
            </ol>
          )}
          <Link href="/games/alfazy/leaderboard/individual/daily" className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline">
            Full leaderboard →
          </Link>
        </section>

        {/* Your stats */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-gray-900">Your Stats</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-50 p-4">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-brand">Games Played</div>
              <CountUp value={gamesPlayed} className="mt-1 block text-3xl font-extrabold text-brand" />
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-amber-600">Titles</div>
              <CountUp value={trophies.length} className="mt-1 block text-3xl font-extrabold text-amber-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-[13.5px] text-gray-700">
            <Flame className="h-4 w-4 text-orange-500" />
            {myRank ? (
              <span>
                You&apos;re <span className="font-bold text-gray-900">#{myRank}</span> on today&apos;s board
              </span>
            ) : (
              <span>Play today to get ranked</span>
            )}
          </div>
        </section>
      </div>

      <NudgePanel connections={nudgeTargets} />
    </div>
  );
}
