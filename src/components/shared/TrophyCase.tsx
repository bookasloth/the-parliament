"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy as TrophyIcon } from "lucide-react";
import { getTrophiesAction } from "@/app/(main)/games/alfazy/actions";
import { trophyDef, TROPHY_TONE_CLASS } from "@/config/alfazy-trophies";
import { formatAnchor, PERIOD_LABEL } from "@/modules/games/format";
import type { Trophy } from "@/modules/games/champions";

/**
 * Profile trophy case — Alfazy champion titles the member (or their house/batch)
 * has won. Derived entirely from frozen champion rows; renders nothing until it
 * has data so it never shows an empty shell.
 */
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

  const shown = trophies.slice(0, 6);
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

      <div className="flex flex-wrap gap-2.5">
        {shown.map((t) => {
          const def = trophyDef(t.scope, t.period);
          const Icon = def.Icon;
          return (
            <div
              key={`${t.scope}-${t.period}-${t.anchor}`}
              title={`${def.label} — ${formatAnchor(t.period, t.anchor)}${t.scope !== "individual" ? ` (${t.label})` : ""}`}
              className={`flex h-11 w-11 items-center justify-center rounded-[5px] ring-1 ${TROPHY_TONE_CLASS[def.tone]}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          );
        })}
        {more > 0 && (
          <Link
            href={`/games/alfazy/champions?winner=${userId}`}
            className="flex h-11 w-11 items-center justify-center rounded-[5px] bg-gray-50 text-xs font-bold text-gray-500 ring-1 ring-gray-200 hover:bg-gray-100"
          >
            +{more}
          </Link>
        )}
      </div>

      <p className="mt-3 text-[13px] font-semibold text-gray-900">
        {trophies.length} title{trophies.length === 1 ? "" : "s"}
        <span className="ml-1 font-normal text-gray-500">across {PERIOD_LABEL.weekly.toLowerCase()} &amp; more</span>
      </p>
    </div>
  );
}
