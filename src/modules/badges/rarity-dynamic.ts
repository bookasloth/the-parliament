import { prisma } from "@/lib/prisma";
import type { BadgeRarity } from "@/config/badges";

/**
 * Rarity from actual scarcity (how many alumni hold the badge). Fewer holders =
 * rarer. 0 holders → legendary (nobody has it yet).
 *   < 12   → legendary
 *   < 30   → epic
 *   < 60   → rare
 *   <= 100 → uncommon
 *   > 100  → common
 */
export function deriveRarity(holders: number): BadgeRarity {
  if (holders < 12) return "legendary";
  if (holders < 30) return "epic";
  if (holders < 60) return "rare";
  if (holders <= 100) return "uncommon";
  return "common";
}

/** badgeId → live rarity, from one groupBy over user_badges. Absent = 0 holders. */
export async function badgeRarityMap(): Promise<Map<string, BadgeRarity>> {
  const groups = await prisma.userBadge.groupBy({ by: ["badgeId"], _count: { badgeId: true } });
  const m = new Map<string, BadgeRarity>();
  for (const g of groups) m.set(g.badgeId, deriveRarity(g._count.badgeId));
  return m;
}

export const rarityForCount = deriveRarity;
