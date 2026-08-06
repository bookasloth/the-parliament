"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export interface PodiumEntry {
  key: string;
  label: string;
  color: string | null;
  total: number;
  avatarUrl: string | null;
}

const MEDAL = ["bg-amber-400 text-white", "bg-gray-300 text-gray-800", "bg-orange-400 text-white"];
const HEIGHT = ["h-24", "h-16", "h-12"];
const VISUAL_ORDER = [1, 0, 2]; // 2nd, 1st, 3rd

export default function Podium({
  entries,
  scope,
  currentUserId,
}: {
  entries: PodiumEntry[];
  scope: string;
  currentUserId: string;
}) {
  return (
    <div className="flex items-end justify-center gap-3">
      {VISUAL_ORDER.map((rankIdx, i) => {
        const e = entries[rankIdx];
        if (!e) return <div key={i} className="w-24" />;
        const ring = rankIdx === 0 ? "ring-2 ring-amber-400 ring-offset-2" : "";
        const bg = scope === "house" && e.color ? e.color : "var(--color-brand)";
        return (
          <motion.div
            key={e.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 260, damping: 20 }}
            className="flex w-24 flex-col items-center"
          >
            {e.avatarUrl ? (
              <Image
                src={e.avatarUrl}
                alt={e.label}
                width={48}
                height={48}
                className={`mb-2 h-12 w-12 rounded-full object-cover ${ring}`}
              />
            ) : (
              <div
                className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${ring}`}
                style={{ background: bg }}
              >
                {e.label.charAt(0)}
              </div>
            )}
            <p className="mb-1 max-w-full truncate text-center text-[12.5px] font-semibold text-gray-800">
              {e.key === currentUserId ? "You" : e.label}
            </p>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              transition={{ delay: i * 0.12 + 0.1, duration: 0.4 }}
              className={`flex ${HEIGHT[rankIdx]} w-full items-center justify-center rounded-t-lg text-xl font-extrabold ${MEDAL[rankIdx]}`}
            >
              {rankIdx + 1}
            </motion.div>
            <p className="mt-1 text-[12px] font-semibold text-gray-500">{e.total} pts</p>
          </motion.div>
        );
      })}
    </div>
  );
}
