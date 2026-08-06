import Link from "next/link";
import { PERIODS, type Period } from "@/modules/games/periods";
import { PERIOD_LABEL, SCOPE_LABEL, SCOPES, type Scope } from "@/modules/games/format";

/**
 * Leaderboard tabs = prefetched <Link>s to sibling routes
 * (/games/alfazy/leaderboard/[scope]/[period]). Next prefetches each on hover/
 * viewport and the target's data is served from the cache, so switching is
 * effectively instant — no client round-trip, no spinner.
 */
export default function LeaderboardTabs({
  scope,
  period,
  anchor,
}: {
  scope: Scope;
  period: Period;
  anchor?: string;
}) {
  const base = "/games/alfazy/leaderboard";
  const q = anchor ? `?anchor=${anchor}` : "";

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        {SCOPES.map((s) => (
          <Link
            key={s}
            href={`${base}/${s}/${period}${q}`}
            prefetch
            className={`rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-all active:scale-95 ${
              s === scope ? "bg-brand text-white shadow-sm" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {SCOPE_LABEL[s]}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`${base}/${scope}/${p}${q}`}
            prefetch
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all active:scale-95 ${
              p === period ? "bg-gray-900 text-white" : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {PERIOD_LABEL[p]}
          </Link>
        ))}
      </div>
    </div>
  );
}
