"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PERIODS, type Period } from "@/modules/games/periods";
import { PERIOD_LABEL, SCOPE_LABEL, SCOPES, type Scope } from "@/modules/games/format";

/**
 * Client tab bar for the leaderboard. Uses useTransition so the active tab flips
 * instantly and a pending bar shows while the server re-renders the board —
 * server data-fetching stays, but the interaction feels immediate.
 */
export default function LeaderboardTabs({ scope, period }: { scope: Scope; period: Period }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (next: Partial<{ scope: Scope; period: Period }>) => {
    const q = new URLSearchParams({ scope: next.scope ?? scope, period: next.period ?? period });
    startTransition(() => router.push(`/games/alfazy/leaderboard?${q.toString()}`));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        {SCOPES.map((s) => (
          <button
            key={s}
            onClick={() => go({ scope: s })}
            className={`rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-all active:scale-95 ${
              s === scope ? "bg-brand text-white shadow-sm" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {SCOPE_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => go({ period: p })}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all active:scale-95 ${
              p === period ? "bg-gray-900 text-white" : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full">
        {pending && <div className="h-full w-1/3 animate-[slide-in-right_0.8s_ease-in-out_infinite] bg-brand" />}
      </div>
    </div>
  );
}
