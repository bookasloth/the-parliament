import Link from "next/link";
import type { BadgeRarity } from "@/config/badges";
import { RARITY_TONE, BADGE_FALLBACK } from "./rarity";

export interface BadgeView {
  key: string;
  label: string;
  description: string | null;
  iconUrl: string | null;
  rarity: BadgeRarity;
  isHidden: boolean;
  earned: boolean;
  awardedAt?: Date | null;
  /** Requirement hint (e.g. "Target: 10"). */
  requirement?: string | null;
  /** The viewer's unlock rank (Nth to earn it), when they've earned it. */
  unlockRank?: number | null;
}

const SIZE = {
  sm: { tile: "h-11 w-11", pad: "p-1.5", name: "text-[11px]", box: "p-2", dot: "h-1.5 w-1.5", rank: "text-[9px]" },
  md: { tile: "h-16 w-16", pad: "p-2.5", name: "text-[10px] sm:text-xs", box: "p-3", dot: "h-2 w-2", rank: "text-[10px]" },
} as const;

/**
 * One badge tile — a fixed-size white box: art (padded, greyscale when locked →
 * full colour on hover; earned shows in colour), the name, then a rarity dot +
 * the viewer's unlock rank underneath. No tooltip.
 */
export default function BadgeCard({ badge, size = "md", href }: { badge: BadgeView; size?: "sm" | "md"; href?: string }) {
  const s = SIZE[size];
  const tone = RARITY_TONE[badge.rarity];
  const rank = badge.earned ? badge.unlockRank ?? null : null;

  const inner = (
    <div className={`group flex h-full flex-col items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white ${s.box} text-center transition hover:border-gray-300 hover:shadow-sm`}>
      <div className={`flex ${s.tile} items-center justify-center`}>
        {/* Padded so the art reads ~25% smaller than the box. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badge.iconUrl || BADGE_FALLBACK}
          alt=""
          className={`h-full w-full object-contain ${s.pad} transition duration-200 ${badge.earned ? "" : "grayscale group-hover:grayscale-0"}`}
        />
      </div>
      <span className={`${s.name} flex min-h-[2.4em] items-center font-semibold leading-tight line-clamp-2 ${badge.earned ? "text-gray-800" : "text-gray-500 group-hover:text-gray-800"}`}>
        {badge.label}
      </span>
      {/* Under the name: the rarity-coloured rank when earned, else a rarity dot. */}
      <div className="flex h-3 items-center justify-center">
        {rank ? (
          <span className={`${s.rank} font-bold ${tone.text}`}>#{rank}</span>
        ) : (
          <span className={`${s.dot} rounded-full ${tone.dot}`} />
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}
