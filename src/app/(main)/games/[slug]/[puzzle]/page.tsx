import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock, ArrowLeft, Crown } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { gameBySlug, launchDate, canViewArchive } from "@/config/games";
import { getBoardTheme } from "@/config/game-themes";
import { getEngine, hasEngine } from "@/modules/games/engines";
import { puzzleNumber } from "@/modules/games/periods";
import GameBoard from "@/components/games/GameBoard";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";
import { getPoster } from "@/lib/games/poster";

export const dynamic = "force-dynamic";

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function PuzzlePage({ params }: { params: Promise<{ slug: string; puzzle: string }> }) {
  const { slug, puzzle } = await params;
  const cfg = gameBySlug(slug);
  if (!cfg || cfg.status !== "live" || !hasEngine(cfg.key)) notFound();

  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 1) notFound();

  const launch = launchDate(cfg.key);
  const today = puzzleNumber(todayUtc(), launch);
  if (n > today) notFound(); // no future puzzles
  if (n === today) redirect(`/games/${cfg.slug}/play`); // today's is the live daily

  const user = await requireUser();
  const poster = await getPoster(user.id);
  const inFreeWindow = n === today - 1; // yesterday (today handled above)
  const engine = getEngine(cfg.key);
  const puzzleDate = new Date(launch.getTime() + (n - 1) * 86_400_000);
  const dateLabel = puzzleDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  if (!inFreeWindow && !canViewArchive(user.membershipStatus)) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[5px] bg-amber-50">
          <Lock className="h-7 w-7 text-amber-500" />
        </div>
        <h1 className="font-heading text-xl font-bold text-gray-900">Archive is a member perk</h1>
        <p className="text-[14px] text-gray-600">
          Today and yesterday&apos;s puzzles are free. Unlock the full {cfg.name} archive — every puzzle back to #001 —
          with a paid membership.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/membership" className="inline-flex items-center gap-1.5 rounded-[4px] bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105">
            <Crown className="h-4 w-4" /> Upgrade
          </Link>
          <Link href={`/games/${cfg.slug}/archive`} className="inline-flex items-center gap-1.5 rounded-[4px] bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            <ArrowLeft className="h-4 w-4" /> Archive
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Archive</p>
          <h1 className="font-heading text-lg font-bold text-gray-900">
            {cfg.name} #{String(n).padStart(3, "0")} <span className="font-normal text-gray-400">· {dateLabel}</span>
          </h1>
        </div>
        <Link href={`/games/${cfg.slug}/archive`} className="flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> Archive
        </Link>
      </div>
      {engine.render === "count" ? (
        <HitAndBlowBoard
          gameKey={cfg.key}
          slug={cfg.slug}
          code={cfg.code}
          name={`${cfg.name} #${String(n).padStart(3, "0")}`}
          length={engine.length}
          maxGuesses={engine.maxGuesses}
          puzzleNo={n}
          archive
          poster={poster}
        />
      ) : (
        <GameBoard
          gameKey={cfg.key}
          slug={cfg.slug}
          code={cfg.code}
          name={`${cfg.name} #${String(n).padStart(3, "0")}`}
          length={engine.length}
          maxGuesses={engine.maxGuesses}
          render={engine.render}
          keyboard={engine.keyboard}
          theme={getBoardTheme(cfg.key)}
          puzzleNo={n}
          archive
          poster={poster}
        />
      )}
    </div>
  );
}
