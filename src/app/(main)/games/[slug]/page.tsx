import Link from "next/link";
import { notFound } from "next/navigation";
import { Type, Binary, Sigma, Trophy, Flame, Play, CheckCircle2, ChevronRight, History, type LucideIcon } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { gameBySlug, launchDate, type GameKey } from "@/config/games";
import { getEngine, hasEngine } from "@/modules/games/engines";
import { puzzleNumber } from "@/modules/games/periods";
import { leaderboardCached, gameId, currentStreak } from "@/modules/games/leaderboard";
import { trophiesForUser } from "@/modules/games/champions";
import { colorAvatar } from "@/lib/avatar";
import CountUp from "@/components/games/CountUp";
import NudgePanel from "@/components/games/NudgePanel";

export const dynamic = "force-dynamic";

const ICONS: Record<GameKey, LucideIcon> = { alfazy: Type, hit_and_blow: Binary, integra: Sigma };

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function GameLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = gameBySlug(slug);
  if (!cfg || cfg.status !== "live" || !hasEngine(cfg.key)) notFound();

  const user = await requireUser();
  const id = await gameId(cfg.key);
  const engine = getEngine(cfg.key);
  const puzzleNo = puzzleNumber(todayUtc(), launchDate(cfg.key));
  const Icon = ICONS[cfg.key];

  const [playedToday, gamesPlayed, board, trophies, streak, viewerProfile] = await Promise.all([
    prisma.gameScore.findUnique({
      where: { gameId_userId_puzzleDate: { gameId: id, userId: user.id, puzzleDate: todayUtc() } },
      select: { score: true, solved: true, levelReached: true },
    }),
    prisma.gameScore.count({ where: { gameId: id, userId: user.id } }),
    leaderboardCached(cfg.key, "individual", "daily"),
    trophiesForUser(user.id),
    currentStreak(cfg.key, user.id),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { houseId: true, batchId: true } }),
  ]);

  const orClauses: object[] = [];
  if (viewerProfile?.houseId) orClauses.push({ houseId: viewerProfile.houseId });
  if (viewerProfile?.batchId) orClauses.push({ batchId: viewerProfile.batchId });
  const peers = orClauses.length
    ? await prisma.user.findMany({
        where: { status: "active", id: { not: user.id }, profile: { OR: orClauses } },
        take: 30,
        select: { id: true, displayName: true, legalName: true, profile: { select: { photoUrl: true, headline: true } } },
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

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[5px] bg-brand text-white">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">{cfg.name}</h1>
          <p className="text-[13.5px] text-gray-500">Puzzle #{String(puzzleNo).padStart(3, "0")} · a new {cfg.unit} every day</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="relative overflow-hidden rounded-[5px] bg-gradient-to-br from-brand to-brand-700 p-6 text-white">
          <h2 className="font-heading text-xl font-bold">Play {cfg.name}</h2>
          {playedToday ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[5px] bg-white/15 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-5 w-5" /> Done for today
                </div>
                <p className="mt-1 text-[13px] text-white/85">
                  {playedToday.solved ? `Solved in ${playedToday.levelReached}/${engine.maxGuesses}` : "Not solved"} · {playedToday.score} pts
                </p>
                {streak > 1 && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-[3px] bg-white/20 px-2.5 py-1 text-[12px] font-semibold">
                    <Flame className="h-3.5 w-3.5" /> {streak}-day streak
                  </span>
                )}
              </div>
              <Link href={`/games/${cfg.slug}/results`} className="block rounded-[4px] bg-white py-2.5 text-center text-sm font-semibold text-brand hover:bg-white/90">
                See your result
              </Link>
            </div>
          ) : (
            <Link href={`/games/${cfg.slug}/play`} className="mt-4 flex items-center justify-between rounded-[5px] bg-white/15 p-4 transition-colors hover:bg-white/25">
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  <Play className="h-5 w-5" /> Daily Challenge
                </span>
                <span className="mt-0.5 block text-[13px] text-white/85">Solve today&apos;s {cfg.name} and climb the ranks</span>
              </span>
              <ChevronRight className="h-5 w-5" />
            </Link>
          )}
          <Link href={`/games/${cfg.slug}/leaderboard/individual/daily`} className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-white/90 hover:text-white">
            <Trophy className="h-4 w-4" /> Leaderboards &amp; champions
          </Link>
          <Link href={`/games/${cfg.slug}/archive`} className="mt-1.5 flex items-center gap-2 text-[13px] font-semibold text-white/90 hover:text-white">
            <History className="h-4 w-4" /> Play past puzzles
          </Link>
        </section>

        <section className="rounded-[5px] border border-gray-200 bg-white p-6">
          <h2 className="font-heading text-lg font-bold text-gray-900">Your stats</h2>
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
              <Flame className="h-4 w-4 text-orange-500" /> You&apos;re <span className="font-bold text-gray-900">#{myRank}</span> on today&apos;s board
            </p>
          )}
        </section>
      </div>

      {/* Leaderboard + nudge only appear once you've played today. */}
      {playedToday && (
        <>
          <section className="rounded-[5px] border border-gray-200 bg-white p-5">
            <h2 className="font-heading text-lg font-bold text-gray-900">Today&apos;s Leaderboard</h2>
            {top5.length === 0 ? (
              <p className="mt-4 text-[13.5px] text-gray-500">No plays yet today — be the first!</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {top5.map((e) => (
                  <li key={e.key} className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-[3px] text-[13px] font-bold ${e.rank === 1 ? "bg-amber-100 text-amber-700" : e.rank === 2 ? "bg-gray-200 text-gray-700" : e.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-500"}`}>
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
            <Link href={`/games/${cfg.slug}/leaderboard/individual/daily`} className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline">
              Full leaderboard →
            </Link>
          </section>

          {nudgeTargets.length > 0 && (
            <NudgePanel connections={nudgeTargets} title="Nudge your batchmates & housemates" subtitle="A nudge lands as a message. One per person per day." />
          )}
        </>
      )}
    </div>
  );
}
