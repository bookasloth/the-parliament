import Link from "next/link";
import { Type, Binary, Sigma, Gamepad2, Trophy, Flame, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GAMES, type GameKey } from "@/config/games";
import { getAccentHex } from "@/config/game-themes";
import { gameId } from "@/modules/games/leaderboard";

export const metadata = { title: "Games · The Parliament" };
export const dynamic = "force-dynamic";

const ICONS: Record<GameKey, LucideIcon> = {
  alfazy: Type,
  hit_and_blow: Binary,
  integra: Sigma,
};

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function GamesLandingPage() {
  // Plays-today per live game (best-effort; a missing game row just yields 0).
  const liveCounts = await Promise.all(
    GAMES.filter((g) => g.status === "live").map(async (g) => {
      try {
        const id = await gameId(g.key);
        return [g.key, await prisma.gameScore.count({ where: { gameId: id, puzzleDate: todayUtc() } })] as const;
      } catch {
        return [g.key, 0] as const;
      }
    }),
  );
  const playedToday = new Map<GameKey, number>(liveCounts);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Games</h1>
        <p className="mt-1 text-[14px] text-gray-500">
          Play, climb the leaderboards, and win titles for yourself, your house, and your batch.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GAMES.map((g) => {
          const Icon = ICONS[g.key];
          if (g.status !== "live") {
            return (
              <div key={g.key} className="rounded-[5px] border border-dashed border-gray-200 bg-white p-6 opacity-70">
                <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-gray-100 text-gray-400">
                  <Gamepad2 className="h-6 w-6" />
                </div>
                <h2 className="mt-4 font-heading text-lg font-bold text-gray-500">{g.name}</h2>
                <p className="mt-1 text-[13.5px] text-gray-400">{g.tag} · coming soon.</p>
              </div>
            );
          }
          const count = playedToday.get(g.key) ?? 0;
          return (
            <Link
              key={g.key}
              href={`/games/${g.slug}`}
              className={`group relative overflow-hidden rounded-[5px] border border-gray-200 bg-gradient-to-br ${g.tint} p-6 transition-shadow hover:shadow-md`}
            >
              <span className="absolute right-4 top-4 rounded-[3px] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: getAccentHex(g.key) }}>
                Live
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-[5px] text-white" style={{ backgroundColor: getAccentHex(g.key) }}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-heading text-lg font-bold text-gray-900">{g.name}</h2>
              <p className="mt-1 text-[13.5px] text-gray-600">{g.tag}. Daily, weekly, monthly &amp; yearly champions.</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: getAccentHex(g.key) }}>
                  <Trophy className="h-4 w-4" /> Play &amp; compete →
                </span>
                {count > 0 && (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-gray-500">
                    <Flame className="h-3.5 w-3.5 text-orange-500" /> {count} played today
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
