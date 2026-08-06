import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, Crown, Flame, PartyPopper, Gamepad2, ChevronRight, RotateCcw } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { getDailyPuzzle } from "@/modules/games/alfazy";
import { leaderboardCached, alfazyGameId, currentStreak } from "@/modules/games/leaderboard";
import { getFollowData } from "@/modules/connections/service";
import { env } from "@/config/env";
import ShareResult from "@/components/games/ShareResult";
import NudgePanel from "@/components/games/NudgePanel";

export const metadata = { title: "Your result · Alfazy" };
export const dynamic = "force-dynamic";

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

// Other games are not live yet — the honest cross-sell is "what's next", not a
// fake playable link. Kept in sync with the /games grid.
const UPCOMING = ["Tic Tac Toe", "Rock Paper Scissors", "Guess the Number", "Memory Flip"];

export default async function AlfazyResultsPage() {
  const user = await requireUser();
  const gameId = await alfazyGameId();
  const { puzzleNo } = await getDailyPuzzle();

  const played = await prisma.gameScore.findUnique({
    where: { gameId_userId_puzzleDate: { gameId, userId: user.id, puzzleDate: todayUtc() } },
    select: { score: true, solved: true, levelReached: true },
  });
  // No result to show — send them to play today's puzzle.
  if (!played) redirect("/games/alfazy/play");

  const [board, streak, follow] = await Promise.all([
    leaderboardCached("individual", "daily"),
    currentStreak(user.id),
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
  const heading = solved
    ? streak > 1
      ? `${streak}-day streak — you're on fire!`
      : "You're crushing it!"
    : "Tomorrow's a fresh word.";
  const shareText = `Alfazy #${String(puzzleNo).padStart(3, "0")} — ${
    solved ? `solved ${played.levelReached}/6` : "unsolved"
  } · ${played.score} pts${streak > 1 ? ` · ${streak}-day streak 🔥` : ""}\nPlay: ${env.authUrl}/games/alfazy`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-700 p-7 text-center text-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <PartyPopper className="h-7 w-7" />
        </div>
        <p className="mt-3 text-[13px] font-semibold uppercase tracking-wide text-white/80">
          Alfazy #{String(puzzleNo).padStart(3, "0")}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold">{heading}</h1>

        <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
          <Stat label="Result" value={solved ? `${played.levelReached}/6` : "—"} />
          <Stat label="Points" value={String(played.score)} />
          <Stat label="Streak" value={streak > 0 ? `${streak}d` : "—"} />
        </div>

        {topPct != null && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold">
            <Trophy className="h-4 w-4" /> Top {topPct}% of today&apos;s players
            {myRank && <span className="text-white/70">· #{myRank}</span>}
          </p>
        )}

        <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row">
          <ShareResult text={shareText} className="flex-1 bg-white text-brand hover:bg-white/90" />
          <Link
            href="/games/alfazy/leaderboard/individual/daily"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
          >
            <Trophy className="h-4 w-4" /> Leaderboard
          </Link>
        </div>
      </section>

      {/* Secondary CTAs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/games/alfazy/champions"
          className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <span className="flex items-center gap-2.5 text-[14px] font-semibold text-amber-800">
            <Crown className="h-5 w-5 text-amber-500" /> Hall of Champions
          </span>
          <ChevronRight className="h-4 w-4 text-amber-500" />
        </Link>
        <Link
          href="/games/alfazy"
          className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand hover:bg-brand-50"
        >
          <span className="flex items-center gap-2.5 text-[14px] font-semibold text-gray-800">
            <RotateCcw className="h-5 w-5 text-brand" /> Come back tomorrow
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
      </div>

      {/* Nudge — connections who haven't played today */}
      {nudgeTargets.length > 0 && (
        <NudgePanel
          connections={nudgeTargets}
          title="Challenge your connections"
          subtitle="Nudge them to beat your score before the day resets."
        />
      )}

      {/* Next-game cross-sell */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-gray-900">More games coming</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">New ways to compete with your batch and house.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {UPCOMING.map((name) => (
            <div key={name} className="rounded-xl border border-dashed border-gray-200 p-3 text-center">
              <Gamepad2 className="mx-auto h-5 w-5 text-gray-300" />
              <p className="mt-1.5 text-[12px] font-semibold text-gray-500">{name}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-300">Soon</p>
            </div>
          ))}
        </div>
        <Link href="/games" className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
          Browse all games <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 py-3">
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}
