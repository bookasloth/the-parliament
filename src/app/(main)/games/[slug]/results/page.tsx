import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy, Crown, PartyPopper, ChevronRight, RotateCcw } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { gameBySlug, launchDate } from "@/config/games";
import { getEngine, hasEngine } from "@/modules/games/engines";
import { puzzleNumber } from "@/modules/games/periods";
import { leaderboardCached, gameId, currentStreak } from "@/modules/games/leaderboard";
import { getFollowData } from "@/modules/connections/service";
import { env } from "@/config/env";
import { buildShareText, gameShareUrl } from "@/lib/games/share";
import { getAccentHex } from "@/config/game-themes";
import ShareResult from "@/components/games/ShareResult";
import NudgePanel from "@/components/games/NudgePanel";

export const dynamic = "force-dynamic";

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function ResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = gameBySlug(slug);
  if (!cfg || cfg.status !== "live" || !hasEngine(cfg.key)) notFound();

  const user = await requireUser();
  const id = await gameId(cfg.key);
  const maxG = getEngine(cfg.key).maxGuesses;
  const puzzleNo = puzzleNumber(todayUtc(), launchDate(cfg.key));

  const played = await prisma.gameScore.findUnique({
    where: { gameId_userId_puzzleDate: { gameId: id, userId: user.id, puzzleDate: todayUtc() } },
    select: { score: true, solved: true, levelReached: true },
  });
  if (!played) redirect(`/games/${cfg.slug}/play`);

  const [board, streak, follow] = await Promise.all([
    leaderboardCached(cfg.key, "individual", "daily"),
    currentStreak(cfg.key, user.id),
    getFollowData(user.id),
  ]);

  const myRank = board.entries.find((e) => e.key === user.id)?.rank ?? null;
  const totalPlayers = board.entries.length;
  const topPct = myRank && totalPlayers ? Math.max(1, Math.round((myRank / totalPlayers) * 100)) : null;

  const playedIds = new Set(board.entries.map((e) => e.key));
  const nudgeTargets = follow.following
    .filter((c) => !playedIds.has(c.userId ?? c.id))
    .map((c) => ({ userId: c.userId ?? c.id, name: c.name, avatar: c.avatar, headline: c.headline }));

  const solved = played.solved;
  const heading = solved ? (streak > 1 ? `${streak}-day streak — you're on fire!` : "You're crushing it!") : "Tomorrow's a fresh one.";
  const shareUrl = gameShareUrl(env.authUrl, cfg.code);
  const shareText = buildShareText({
    name: cfg.name,
    puzzleNo,
    solved,
    guesses: played.levelReached,
    maxGuesses: maxG,
    score: played.score,
    url: shareUrl,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="relative overflow-hidden rounded-[5px] bg-gradient-to-br from-brand to-brand-700 p-7 text-center text-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[5px] bg-white/15">
          <PartyPopper className="h-7 w-7" />
        </div>
        <p className="mt-3 text-[13px] font-semibold uppercase tracking-wide text-white/80">
          {cfg.name} #{String(puzzleNo).padStart(3, "0")}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold">{heading}</h1>

        <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
          <Stat label="Result" value={solved ? `${played.levelReached}/${maxG}` : "—"} />
          <Stat label="Points" value={String(played.score)} />
          <Stat label="Streak" value={streak > 0 ? `${streak}d` : "—"} />
        </div>

        {topPct != null && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-[3px] bg-white/15 px-3 py-1.5 text-[13px] font-semibold">
            <Trophy className="h-4 w-4" /> Top {topPct}% of today&apos;s players
            {myRank && <span className="text-white/70">· #{myRank}</span>}
          </p>
        )}

        <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row">
          <ShareResult
            text={shareText}
            url={shareUrl}
            className="flex-1 bg-white text-brand hover:bg-white/90"
            gameKey={cfg.key}
            image={{
              gameName: cfg.name,
              puzzleNo,
              solved,
              guesses: played.levelReached,
              maxGuesses: maxG,
              score: played.score,
              streak,
              accent: getAccentHex(cfg.key),
            }}
          />
          <Link href={`/games/${cfg.slug}/leaderboard/individual/daily`} className="flex flex-1 items-center justify-center gap-2 rounded-[4px] bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25">
            <Trophy className="h-4 w-4" /> Leaderboard
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/games/${cfg.slug}/champions`} className="flex items-center justify-between rounded-[5px] border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100">
          <span className="flex items-center gap-2.5 text-[14px] font-semibold text-amber-800">
            <Crown className="h-5 w-5 text-amber-500" /> Hall of Champions
          </span>
          <ChevronRight className="h-4 w-4 text-amber-500" />
        </Link>
        <Link href={`/games/${cfg.slug}`} className="flex items-center justify-between rounded-[5px] border border-gray-200 bg-white p-4 transition-colors hover:border-brand hover:bg-brand-50">
          <span className="flex items-center gap-2.5 text-[14px] font-semibold text-gray-800">
            <RotateCcw className="h-5 w-5 text-brand" /> Come back tomorrow
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
      </div>

      {nudgeTargets.length > 0 && (
        <NudgePanel connections={nudgeTargets} title="Challenge your connections" subtitle="Nudge them to beat your score before the day resets." />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] bg-white/15 py-3">
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}
