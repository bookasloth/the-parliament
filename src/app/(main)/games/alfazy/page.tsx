import Link from "next/link";
import { Type, Trophy, Flame, Play, CheckCircle2, ChevronRight } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { getDailyPuzzle } from "@/modules/games/alfazy";
import { leaderboardCached, alfazyGameId, currentStreak } from "@/modules/games/leaderboard";
import { trophiesForUser } from "@/modules/games/champions";
import { colorAvatar } from "@/lib/avatar";
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

  const [playedToday, gamesPlayed, board, trophies, streak, viewerProfile] = await Promise.all([
    prisma.gameScore.findUnique({
      where: { gameId_userId_puzzleDate: { gameId, userId: user.id, puzzleDate: todayUtc() } },
      select: { score: true, solved: true, levelReached: true },
    }),
    prisma.gameScore.count({ where: { gameId, userId: user.id } }),
    leaderboardCached("alfazy", "individual", "daily"),
    trophiesForUser(user.id),
    currentStreak("alfazy", user.id),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { houseId: true, batchId: true },
    }),
  ]);

  // Nudge list: housemates + batchmates (not all connections)
  const orClauses: object[] = [];
  if (viewerProfile?.houseId) orClauses.push({ houseId: viewerProfile.houseId });
  if (viewerProfile?.batchId) orClauses.push({ batchId: viewerProfile.batchId });
  const peers = orClauses.length > 0
    ? await prisma.user.findMany({
        where: {
          status: "active",
          id: { not: user.id },
          profile: { OR: orClauses },
        },
        take: 30,
        select: {
          id: true,
          displayName: true,
          legalName: true,
          profile: { select: { photoUrl: true, headline: true } },
        },
      })
    : [];
  const nudgeTargets = peers.map((p) => ({
    userId: p.id,
    name: p.displayName || p.legalName,
    avatar: p.profile?.photoUrl || colorAvatar(p.id),
    headline: p.profile?.headline ?? undefined,
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
        <div className="flex h-11 w-11 items-center justify-center rounded-[5px] bg-brand text-white">
          <Type className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Alfazy</h1>
          <p className="text-[13.5px] text-gray-500">Puzzle #{String(puzzleNo).padStart(3, "0")} · a new word every day</p>
        </div>
      </header>

      {/* Play card (left) + How to play (right) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="relative overflow-hidden rounded-[5px] bg-gradient-to-br from-brand to-brand-700 p-6 text-white">
          <h2 className="font-heading text-xl font-bold">Play Alfazy</h2>
          {playedToday ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[5px] bg-white/15 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-5 w-5" /> Done for today
                </div>
                <p className="mt-1 text-[13px] text-white/85">
                  {playedToday.solved ? `Solved in ${playedToday.levelReached}/6` : "Not solved"} · {playedToday.score} pts
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {streak > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-[3px] bg-white/20 px-2.5 py-1 text-[12px] font-semibold">
                      <Flame className="h-3.5 w-3.5" /> {streak}-day streak
                    </span>
                  )}
                  {topPct != null && (
                    <span className="inline-flex items-center rounded-[3px] bg-white/20 px-2.5 py-1 text-[12px] font-semibold">
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
                className="mt-4 flex items-center justify-between rounded-[5px] bg-white/15 p-4 transition-colors hover:bg-white/25"
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

        <section className="rounded-[5px] border border-gray-200 bg-white p-6">
          <h2 className="font-heading text-lg font-bold text-gray-900">How to play</h2>
          <ol className="mt-3 space-y-2.5 text-[14px] text-gray-700">
            <li className="flex gap-2.5"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[3px] bg-brand-50 text-[12px] font-bold text-brand">1</span> Guess the 5-letter word in 6 tries.</li>
            <li className="flex gap-2.5"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[3px] bg-emerald-50 text-[12px] font-bold text-emerald-600">2</span> <span><span className="inline-block h-4 w-4 rounded-[2px] bg-emerald-500 align-text-bottom" /> = correct spot, <span className="inline-block h-4 w-4 rounded-[2px] bg-amber-400 align-text-bottom" /> = wrong spot, <span className="inline-block h-4 w-4 rounded-[2px] bg-gray-400 align-text-bottom" /> = not in word.</span></li>
            <li className="flex gap-2.5"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[3px] bg-amber-50 text-[12px] font-bold text-amber-600">3</span> Fewer guesses = higher score. Keep your streak alive!</li>
          </ol>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[5px] bg-brand-50 p-3 text-center">
              <CountUp value={gamesPlayed} className="block text-2xl font-extrabold text-brand" />
              <div className="text-[11px] font-semibold uppercase tracking-wide text-brand/70">Games</div>
            </div>
            <div className="rounded-[5px] bg-amber-50 p-3 text-center">
              <CountUp value={trophies.length} className="block text-2xl font-extrabold text-amber-600" />
              <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600/70">Titles</div>
            </div>
          </div>
          {myRank && (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-gray-500">
              <Flame className="h-4 w-4 text-orange-500" />
              You&apos;re <span className="font-bold text-gray-900">#{myRank}</span> on today&apos;s board
            </p>
          )}
        </section>
      </div>

      {/* Today's leaderboard */}
      <section className="rounded-[5px] border border-gray-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-gray-900">Today&apos;s Leaderboard</h2>
        {top5.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-gray-500">No plays yet today — be the first!</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {top5.map((e) => (
              <li key={e.key} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-[3px] text-[13px] font-bold ${
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

      <NudgePanel connections={nudgeTargets} title="Nudge your batchmates & housemates" subtitle="A nudge lands as a notification. One per person per day." />
    </div>
  );
}
