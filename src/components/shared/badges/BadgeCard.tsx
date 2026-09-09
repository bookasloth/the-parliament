import Link from "next/link";
import type { BadgeRarity } from "@/config/badges";
import { RARITY_TONE, RARITY_LABEL, BADGE_FALLBACK } from "./rarity";

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
  sm: { tile: "h-11 w-11", name: "text-[11px]", box: "p-2" },
  md: { tile: "h-16 w-16", name: "text-xs", box: "p-3" },
} as const;

/**
 * One badge tile — a white rounded box: art (greyscale, full colour on hover),
 * name below, and a rarity-coloured dot in the top-right corner. When the viewer
 * has earned it, that dot shows their unlock rank (#N = Nth person to earn it).
 * No lock, no mystery — everyone sees what there is to collect.
 */
export default function BadgeCard({ badge, size = "md", href }: { badge: BadgeView; size?: "sm" | "md"; href?: string }) {
  const s = SIZE[size];
  const tone = RARITY_TONE[badge.rarity];
  const rank = badge.earned ? badge.unlockRank ?? null : null;

  const dotTip = badge.earned
    ? `${RARITY_LABEL[badge.rarity]}${rank ? ` · you unlocked this #${rank}` : ""}`
    : RARITY_LABEL[badge.rarity];
  const tip = `${badge.label} · ${RARITY_LABEL[badge.rarity]}${
    badge.earned
      ? badge.awardedAt
        ? ` · earned ${badge.awardedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
        : ""
      : badge.requirement
        ? ` · ${badge.requirement}`
        : ""
  }${badge.description ? `\n${badge.description}` : ""}`;

  const inner = (
    <div
      className={`group relative flex flex-col items-center gap-2 rounded-[10px] border border-gray-200 bg-white ${s.box} text-center transition hover:border-gray-300 hover:shadow-sm`}
      title={tip}
    >
      {/* Corner dot — rarity colour; shows unlock rank when earned */}
      {rank ? (
        <span
          className={`absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${tone.dot}`}
          title={dotTip}
        >
          #{rank}
        </span>
      ) : (
        <span className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${tone.dot}`} title={dotTip} />
      )}

      <div className={`flex ${s.tile} items-center justify-center`}>
        {/* Earned → full colour. Locked → greyscale, colour on hover to preview. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badge.iconUrl || BADGE_FALLBACK}
          alt=""
          className={`h-full w-full object-contain transition duration-200 ${badge.earned ? "" : "grayscale group-hover:grayscale-0"}`}
        />
      </div>
      <span className={`${s.name} font-semibold leading-tight line-clamp-2 transition-colors ${badge.earned ? "text-gray-800" : "text-gray-500 group-hover:text-gray-800"}`}>
        {badge.label}
      </span>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
