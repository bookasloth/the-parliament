"use client";

import { useEffect, useState } from "react";
import type { RecentUnlock } from "@/modules/badges/profile";
import { RARITY_TONE, RARITY_LABEL, BADGE_FALLBACK } from "./rarity";

const LS_KEY = "nnawca:celebrated-badges";
const CONFETTI = ["#009ae4", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

/**
 * One-time unlock celebration for the owner. Shows a modal per recently-earned
 * badge, tracking which keys were already celebrated in localStorage so it never
 * re-fires on revisit. Tasteful, dismissible — not a casino.
 */
export default function UnlockCelebration({ unlocks }: { unlocks: RecentUnlock[] }) {
  const [queue, setQueue] = useState<RecentUnlock[]>([]);

  useEffect(() => {
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      seen = [];
    }
    const fresh = unlocks.filter((u) => !seen.includes(u.key));
    if (fresh.length) {
      setQueue(fresh);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify([...seen, ...fresh.map((u) => u.key)].slice(-200)));
      } catch {
        /* private mode — celebrate anyway, just don't persist */
      }
    }
  }, [unlocks]);

  if (queue.length === 0) return null;
  const cur = queue[0];
  const tone = RARITY_TONE[cur.rarity];
  const dismiss = () => setQueue((q) => q.slice(1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={dismiss}
      role="dialog"
      aria-label="Achievement unlocked"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 h-2 w-2 rounded-sm"
            style={{
              left: `${(i * 7) % 100}%`,
              background: CONFETTI[i % CONFETTI.length],
              animation: `alfazy-confetti-fall ${1.6 + (i % 5) * 0.3}s linear ${(i % 7) * 0.12}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Achievement Unlocked</p>
        <div className={`mx-auto my-4 flex h-24 w-24 items-center justify-center rounded-2xl ring-2 ${tone.bg} ${tone.ring}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.iconUrl || BADGE_FALLBACK} alt="" className="h-full w-full object-contain p-2" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{cur.label}</h3>
        <p className={`mt-1 text-sm font-semibold ${tone.text}`}>{RARITY_LABEL[cur.rarity]}</p>
        <button onClick={dismiss} className="mt-5 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:opacity-90">
          {queue.length > 1 ? `Next (${queue.length - 1} more)` : "Nice!"}
        </button>
      </div>
    </div>
  );
}
