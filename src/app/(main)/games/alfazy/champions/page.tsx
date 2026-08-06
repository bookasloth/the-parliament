import Link from "next/link";
import { Crown, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { alfazyGameId, SCOPES, type Scope } from "@/modules/games/leaderboard";
import { formatAnchor, PERIOD_LABEL, SCOPE_LABEL } from "@/modules/games/format";
import type { Period } from "@/modules/games/periods";

export const metadata = { title: "Hall of Champions · Alfazy" };
export const dynamic = "force-dynamic";

const PERIOD_ORDER: Record<string, number> = { yearly: 0, monthly: 1, weekly: 2, daily: 3 };

export default async function ChampionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; winner?: string }>;
}) {
  const sp = await searchParams;
  const scopeFilter = SCOPES.includes(sp.scope as Scope) ? (sp.scope as Scope) : null;
  const winner = sp.winner ?? null;

  const gameId = await alfazyGameId();
  const rows = await prisma.gameChampion.findMany({
    where: { gameId, ...(scopeFilter ? { scope: scopeFilter } : {}), ...(winner ? { winnerKey: winner } : {}) },
    orderBy: { decidedAt: "desc" },
  });

  // Group by period+anchor.
  const groups = new Map<string, { period: Period; anchor: string; decidedAt: Date; byScope: Record<string, typeof rows> }>();
  for (const r of rows) {
    const key = `${r.period}:${r.anchor}`;
    const g =
      groups.get(key) ??
      { period: r.period as Period, anchor: r.anchor, decidedAt: r.decidedAt, byScope: { individual: [], house: [], batch: [] } as Record<string, typeof rows> };
    g.byScope[r.scope].push(r);
    if (r.decidedAt > g.decidedAt) g.decidedAt = r.decidedAt;
    groups.set(key, g);
  }
  const ordered = [...groups.values()].sort(
    (a, b) => b.decidedAt.getTime() - a.decidedAt.getTime() || (PERIOD_ORDER[a.period] ?? 9) - (PERIOD_ORDER[b.period] ?? 9),
  );

  const scopesToShow: Scope[] = scopeFilter ? [scopeFilter] : SCOPES;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-gray-900">
            <Crown className="h-6 w-6 text-amber-500" /> Hall of Champions
          </h1>
          <p className="text-[13.5px] text-gray-500">
            {winner ? "Titles won" : "Every Alfazy period winner"}{scopeFilter ? ` · ${SCOPE_LABEL[scopeFilter]} only` : ""}
          </p>
        </div>
        <Link href="/games/alfazy/leaderboard" className="flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to leaderboard
        </Link>
      </header>

      {/* Scope filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={`/games/alfazy/champions${winner ? `?winner=${winner}` : ""}`}
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${!scopeFilter ? "bg-gray-900 text-white" : "bg-white text-gray-500 ring-1 ring-gray-200"}`}
        >
          All
        </Link>
        {SCOPES.map((s) => {
          const q = new URLSearchParams({ scope: s, ...(winner ? { winner } : {}) });
          return (
            <Link
              key={s}
              href={`/games/alfazy/champions?${q.toString()}`}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${scopeFilter === s ? "bg-gray-900 text-white" : "bg-white text-gray-500 ring-1 ring-gray-200"}`}
            >
              {SCOPE_LABEL[s]}
            </Link>
          );
        })}
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          No champions crowned yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-gray-50 text-[12px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Period</th>
                {scopesToShow.map((s) => (
                  <th key={s} className="px-4 py-3 font-semibold">{SCOPE_LABEL[s]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ordered.map((g) => (
                <tr key={`${g.period}:${g.anchor}`}>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">{formatAnchor(g.period, g.anchor)}</span>
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                      {PERIOD_LABEL[g.period]}
                    </span>
                  </td>
                  {scopesToShow.map((s) => {
                    const winners = g.byScope[s] ?? [];
                    return (
                      <td key={s} className="px-4 py-3">
                        {winners.length === 0 ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <span className="flex flex-wrap items-center gap-1.5">
                            {winners.map((w) => (
                              <span
                                key={w.winnerKey}
                                className={`rounded-md px-2 py-1 text-[12.5px] font-semibold ${
                                  winner && w.winnerKey === winner ? "bg-amber-100 text-amber-800" : "bg-gray-50 text-gray-800"
                                }`}
                              >
                                {w.winnerLabel}
                                {winners.length > 1 && <span className="ml-1 text-[10px] text-gray-400">co</span>}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
