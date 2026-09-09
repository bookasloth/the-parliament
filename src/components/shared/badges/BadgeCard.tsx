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
  /** Requirement hint shown on locked badges (e.g. "10 posts"). */
  requirement?: string | null;
}

const SIZE = {
  sm: { tile: "h-12 w-12", pad: "p-1.5", name: "text-[11px]" },
  md: { tile: "h-16 w-16", pad: "p-2", name: "text-xs" },
} as const;

/**
 * One badge tile. Earned → full-colour with a rarity ring + name. Locked →
 * greyed with a lock; a locked HIDDEN badge is a mystery ("???"), its name and
 * art withheld. Tooltip (title attr) carries the description / unlock date.
 */
export default function BadgeCard({ badge, size = "md" }: { badge: BadgeView; size?: "sm" | "md" }) {
  const s = SIZE[size];
  const tone = RARITY_TONE[badge.rarity];
  const mystery = !badge.earned && badge.isHidden;

  const name = mystery ? "???" : badge.label;
  const tip = mystery
    ? "Hidden achievement — do something special to discover it."
    : badge.earned
      ? `${badge.label} · ${RARITY_LABEL[badge.rarity]}${badge.awardedAt ? ` · earned ${badge.awardedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}${badge.description ? `\n${badge.description}` : ""}`
      : `${badge.label} · Locked${badge.requirement ? ` · ${badge.requirement}` : ""}${badge.description ? `\n${badge.description}` : ""}`;

  return (
    <div className="flex flex-col items-center gap-1.5 text-center" title={tip}>
      <div
        className={`relative flex ${s.tile} items-center justify-center rounded-[8px] ${s.pad} ring-1 ${
          badge.earned ? `${tone.bg} ${tone.ring}` : "bg-gray-100 ring-gray-200"
        }`}
      >
        {mystery ? (
          <span className="text-lg font-bold text-gray-400">?</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={badge.iconUrl || BADGE_FALLBACK}
            alt=""
            className={`h-full w-full object-contain ${badge.earned ? "" : "opacity-40 grayscale"}`}
          />
        )}
        {!badge.earned && !mystery && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-500 text-[9px] text-white ring-2 ring-white">
            🔒
          </span>
        )}
      </div>
      <span
        className={`${s.name} font-semibold leading-tight ${
          badge.earned ? "text-gray-800" : "text-gray-400"
        } line-clamp-2`}
      >
        {name}
      </span>
    </div>
  );
}
