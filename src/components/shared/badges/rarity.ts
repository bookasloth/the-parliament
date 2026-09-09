import type { BadgeRarity } from "@/config/badges";

/**
 * Rarity → Tailwind tone classes. Adapted from the existing trophy/status tone
 * vocabularies (config/alfazy-trophies.ts, admin-ui statusBadgeClass) so badges
 * read as part of the same system. ring/bg tint the icon tile; text tints the label.
 */
export const RARITY_TONE: Record<BadgeRarity, { ring: string; bg: string; text: string; dot: string }> = {
  common: { ring: "ring-gray-300", bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
  uncommon: { ring: "ring-emerald-300", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rare: { ring: "ring-sky-300", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  epic: { ring: "ring-violet-300", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  legendary: { ring: "ring-amber-300", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
};

export const RARITY_LABEL: Record<BadgeRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_ORDER: BadgeRarity[] = ["legendary", "epic", "rare", "uncommon", "common"];

export const BADGE_FALLBACK = "/achievements/badge.svg";
