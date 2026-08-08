"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy as TrophyIcon } from "lucide-react";
import { getTrophiesAction } from "@/app/(main)/games/alfazy/actions";
import { trophyDef, TROPHY_TONE_CLASS } from "@/config/alfazy-trophies";
import { formatAnchor, PERIOD_LABEL } from "@/modules/games/format";
import type { Trophy } from "@/modules/games/champions";

const SHOWN = 2;

export default function TrophyCase({ userId }: { userId: string }) {
  const [trophies, setTrophies] = useState<Trophy[] | null>(null);

  useEffect(() => {
    let alive = true;
    getTrophiesAction(userId)
      .then((t) => alive && setTrophies(t))
      .catch(() => alive && setTrophies([]));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (!trophies || trophies.length === 0) return null;

  const shown = trophies.slice(0, SHOWN);
  const more = trophies.length - shown.length;

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <TrophyIcon className="h-4 w-4 text-amber-500" /> Trophy Case
        </h4>
        <Link href={`/games/alfazy/champions?winner=${userId}`} className="text-xs font-semibold text-brand hover:underline">
          View all
        </Link>
      </div>

      <div className="space-y-2.5">
        {shown.map((t) => {
          const def = trophyDef(t.scope, t.period);
          const Icon = def.Icon;
          const subtitle = `${formatAnchor(t.period, t.anchor)}${t.scope !== "individual" ? ` · ${t.label}` : ""}`;
          return (
            <div
              key={`${t.scope}-${t.period}-${t.anchor}`}
              className="flex items-center gap-3 rounded-[5px] border border-gray-200 bg-white px-3 py-2.5"
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[4px] ring-1 ${TROPHY_TONE_CLASS[def.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-tight text-gray-900">{def.label}</p>
                <p className="truncate text-[11px] text-gray-500">{subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {more > 0 && (
        <Link
          href={`/games/alfazy/champions?winner=${userId}`}
          className="mt-2 block text-center text-xs font-semibold text-brand hover:underline"
        >
          +{more} more title{more === 1 ? "" : "s"}
        </Link>
      )}
    </div>
  );
}
