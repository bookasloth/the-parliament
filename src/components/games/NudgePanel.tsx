"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Hand, Check } from "lucide-react";
import { nudgePlayerAction } from "@/app/(main)/games/alfazy/actions";

export interface NudgeTarget {
  userId: string;
  name: string;
  avatar: string;
  headline?: string;
}

export default function NudgePanel({
  connections,
  title = "Nudge friends to play",
  subtitle = "A nudge lands as a notification. One per person per day.",
}: {
  connections: NudgeTarget[];
  title?: string;
  subtitle?: string;
}) {
  const [query, setQuery] = useState("");
  const [nudged, setNudged] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((c) => c.name.toLowerCase().includes(q));
  }, [connections, query]);

  // Optimistic + irreversible: a nudge can't be recalled, so flip the button to
  // "Nudged" instantly and fire the action without waiting. rate_limited/errors
  // change nothing the user could act on, so we don't surface them.
  function nudge(userId: string) {
    if (nudged.has(userId)) return;
    setNudged((prev) => new Set(prev).add(userId));
    nudgePlayerAction(userId).catch(() => {});
  }

  if (connections.length === 0) {
    return (
      <section className="rounded-[5px] border border-gray-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-gray-900">Nudge friends to play</h2>
        <p className="mt-2 text-[13.5px] text-gray-500">
          Follow some alumni first — you can nudge your connections to jump on the board.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[5px] border border-gray-200 bg-white p-5">
      <h2 className="font-heading text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-0.5 text-[13px] text-gray-500">{subtitle}</p>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find connections to nudge"
          aria-label="Find connections to nudge"
          className="w-full rounded-[3px] border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-[14px] text-gray-900 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <ul className="mt-3 max-h-[340px] space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="py-6 text-center text-[13.5px] text-gray-400">No connections match “{query}”.</li>
        ) : (
          filtered.map((c) => {
            const done = nudged.has(c.userId);
            return (
              <li key={c.userId} className="flex items-center gap-3 rounded-[5px] px-2 py-2 hover:bg-gray-50">
                <Image
                  src={c.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 flex-shrink-0 rounded-[4px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-gray-900">{c.name}</p>
                  {c.headline && <p className="truncate text-[12px] text-gray-500">{c.headline}</p>}
                </div>
                <button
                  onClick={() => nudge(c.userId)}
                  disabled={done}
                  className={`flex h-9 min-w-[92px] items-center justify-center gap-1.5 rounded-[3px] px-4 text-[13px] font-semibold transition-colors ${
                    done
                      ? "bg-emerald-50 text-emerald-600"
                      : "border border-gray-300 text-gray-700 hover:border-brand hover:bg-brand-50 hover:text-brand"
                  }`}
                >
                  {done ? (
                    <>
                      <Check className="h-4 w-4" /> Nudged
                    </>
                  ) : (
                    <>
                      <Hand className="h-4 w-4" /> Nudge
                    </>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
