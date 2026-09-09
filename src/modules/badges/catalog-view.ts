import { prisma } from "@/lib/prisma";
import { CATEGORY_ORDER, CATEGORY_LABEL, type BadgeCategory } from "@/config/badges";
import type { BadgeView } from "@/components/shared/badges/BadgeCard";
import { unlockRanksForUser } from "./ranks";
import { badgeRarityMap, deriveRarity } from "./rarity-dynamic";

export interface CatalogData {
  totalCount: number;
  earnedCount: number;
  categories: { key: BadgeCategory; label: string; badges: BadgeView[] }[];
}

/**
 * Global badge catalogue grouped by category. If `viewerId` is given, marks the
 * viewer's earned badges (so logged-in members see their own progress on the
 * public list). One or two queries; no per-badge metric eval.
 */
export async function getBadgeCatalog(viewerId?: string): Promise<CatalogData> {
  const [badges, earnedRows] = await Promise.all([
    prisma.badge.findMany({
      orderBy: [{ category: "asc" }, { seriesOrder: "asc" }, { displayPriority: "asc" }, { label: "asc" }],
      select: { id: true, key: true, label: true, description: true, iconUrl: true, rarity: true, category: true, isHidden: true, progressTarget: true },
    }),
    viewerId
      ? prisma.userBadge.findMany({ where: { userId: viewerId }, select: { badgeId: true } })
      : Promise.resolve([]),
  ]);

  const earned = new Set(earnedRows.map((r) => r.badgeId));
  const ranks = viewerId ? await unlockRanksForUser(viewerId) : new Map<string, number>();
  const rmap = await badgeRarityMap();
  const byCategory = new Map<BadgeCategory, BadgeView[]>();
  let earnedCount = 0;

  for (const b of badges) {
    const isEarned = earned.has(b.id);
    if (isEarned) earnedCount++;
    const view: BadgeView = {
      key: b.key,
      label: b.label,
      description: b.description,
      iconUrl: b.iconUrl,
      rarity: rmap.get(b.id) ?? deriveRarity(0),
      isHidden: b.isHidden,
      earned: isEarned,
      unlockRank: isEarned ? ranks.get(b.id) ?? null : null,
      requirement: !isEarned && b.progressTarget ? `Target: ${b.progressTarget.toLocaleString("en-IN")}` : null,
    };
    const cat = (b.category as BadgeCategory) ?? "special";
    const arr = byCategory.get(cat) ?? [];
    arr.push(view);
    byCategory.set(cat, arr);
  }

  const categories = CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => ({
    key: c,
    label: CATEGORY_LABEL[c],
    badges: byCategory.get(c)!,
  }));

  return { totalCount: badges.length, earnedCount, categories };
}
