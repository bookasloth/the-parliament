"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Search, Hand, Check, Loader2 } from "lucide-react";
import { nudgePlayerAction } from "@/app/(main)/games/alfazy/actions";

export interface NudgeTarget {
  userId: string;
  name: string;
  avatar: string;
  headline?: string;
}

type RowState = "idle" | "sending" | "done" | "error";

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
  const [state, setState] = useState<Record<string, RowState>>({});
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((c) => c.name.toLowerCase().includes(q));
  }, [connections, query]);

  function nudge(userId: string) {
    if (state[userId] === "sending" || state[userId] === "done") return;
    setState((s) => ({ ...s, [userId]: "sending" }));
    startTransition(async () => {
      try {
        const res = await nudgePlayerAction(userId);
        // rate_limited already counts as "reached them today" → show done, not error.
        setState((s) => ({ ...s, [userId]: res.ok || res.reason === "rate_limited" ? "done" : "error" }));
      } catch {
        setState((s) => ({ ...s, [userId]: "error" }));
      }
    });
  }

  if (connections.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-gray-900">Nudge friends to play</h2>
        <p className="mt-2 text-[13.5px] text-gray-500">
          Follow some alumni first — you can nudge your connections to jump on the board.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="font-heading text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-0.5 text-[13px] text-gray-500">{subtitle}</p>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find connections to nudge"
          aria-label="Find connections to nudge"
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-[14px] text-gray-900 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <ul className="mt-3 max-h-[340px] space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="py-6 text-center text-[13.5px] text-gray-400">No connections match “{query}”.</li>
        ) : (
          filtered.map((c) => {
            const st = state[c.userId] ?? "idle";
            const done = st === "done";
            return (
              <li key={c.userId} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
                <Image
                  src={c.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-gray-900">{c.name}</p>
                  {c.headline && <p className="truncate text-[12px] text-gray-500">{c.headline}</p>}
                </div>
                <button
                  onClick={() => nudge(c.userId)}
                  disabled={st === "sending" || done}
                  className={`flex h-9 min-w-[92px] items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors ${
                    done
                      ? "bg-emerald-50 text-emerald-600"
                      : st === "error"
                        ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                        : "border border-gray-300 text-gray-700 hover:border-brand hover:bg-brand-50 hover:text-brand"
                  }`}
                >
                  {st === "sending" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : done ? (
                    <>
                      <Check className="h-4 w-4" /> Nudged
                    </>
                  ) : st === "error" ? (
                    "Retry"
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
