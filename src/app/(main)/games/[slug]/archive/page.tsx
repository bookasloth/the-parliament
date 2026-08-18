import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Check, Crown, ArrowLeft } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { gameBySlug, launchDate, canViewArchive } from "@/config/games";
import { hasEngine } from "@/modules/games/engines";
import { puzzleNumber } from "@/modules/games/periods";
import { gameId } from "@/modules/games/leaderboard";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const MAX_SHOWN = 90; // cap the grid; older than this is still reachable by URL

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function ArchivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = gameBySlug(slug);
  if (!cfg || cfg.status !== "live" || !hasEngine(cfg.key)) notFound();

  const user = await requireUser();
  const id = await gameId(cfg.key);
  const launch = launchDate(cfg.key);
  const today = puzzleNumber(todayUtc(), launch);
  const canArchive = canViewArchive(user.membershipStatus);

  const rows = await prisma.gameScore.findMany({
    where: { gameId: id, userId: user.id },
    select: { puzzleDate: true, solved: true },
  });
  const solvedByNo = new Map<number, boolean>();
  for (const r of rows) {
    const no = Math.round((r.puzzleDate.getTime() - launch.getTime()) / DAY_MS) + 1;
    solvedByNo.set(no, r.solved);
  }

  const from = Math.max(1, today - MAX_SHOWN + 1);
  const list: number[] = [];
  for (let n = today; n >= from; n--) list.push(n);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">{cfg.name} Archive</h1>
          <p className="text-[13.5px] text-gray-500">
            Today &amp; yesterday are free{canArchive ? " · you have full archive access" : " · older puzzles need a membership"}.
          </p>
        </div>
        <Link href={`/games/${cfg.slug}`} className="flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to {cfg.name}
        </Link>
      </header>

      {!canArchive && (
        <Link href="/membership" className="flex items-center justify-between rounded-[5px] border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100">
          <span className="flex items-center gap-2.5 text-[14px] font-semibold text-amber-800">
            <Crown className="h-5 w-5 text-amber-500" /> Unlock every past puzzle back to #001
          </span>
          <span className="text-[13px] font-semibold text-amber-700">Upgrade →</span>
        </Link>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {list.map((n) => {
          const isToday = n === today;
          const isYesterday = n === today - 1;
          const locked = !isToday && !isYesterday && !canArchive;
          const played = solvedByNo.has(n);
          const solved = solvedByNo.get(n);
          const href = isToday ? `/games/${cfg.slug}/play` : `/games/${cfg.slug}/${n}`;
          const date = new Date(launch.getTime() + (n - 1) * DAY_MS).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
          return (
            <Link
              key={n}
              href={href}
              className={`relative flex flex-col items-center justify-center rounded-[5px] border p-3 text-center transition-colors ${
                isToday ? "border-brand bg-brand-50" : locked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white hover:border-brand"
              }`}
            >
              {locked && <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-gray-300" />}
              {played && (
                <Check className={`absolute left-1.5 top-1.5 h-3.5 w-3.5 ${solved ? "text-emerald-500" : "text-gray-300"}`} />
              )}
              <span className="text-[15px] font-bold text-gray-900">#{String(n).padStart(3, "0")}</span>
              <span className="mt-0.5 text-[11px] text-gray-400">{isToday ? "Today" : date}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
