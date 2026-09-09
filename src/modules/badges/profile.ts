import { prisma } from "@/lib/prisma";
import {
  CATEGORY_ORDER,
  CATEGORY_LABEL,
  RARITY_WEIGHT,
  type BadgeCategory,
  type BadgeRarity,
} from "@/config/badges";
import type { BadgeView } from "@/components/shared/badges/BadgeCard";

export interface AchievementsSummary {
  score: number;
  earnedCount: number;
  totalCount: number;
  completionPct: number;
  latest: { label: string; iconUrl: string | null; awardedAt: Date } | null;
  categories: { key: BadgeCategory; label: string; badges: BadgeView[] }[];
}

/**
 * Full achievements view for one user: every catalogue badge, grouped by
 * category, flagged earned/locked. Cheap — two queries, no per-badge metric
 * evaluation (locked badges show their requirement text, not live progress).
 */
export async function getUserAchievements(userId: string): Promise<AchievementsSummary> {
  const [badges, earnedRows] = await Promise.all([
    prisma.badge.findMany({
      orderBy: [{ category: "asc" }, { seriesOrder: "asc" }, { displayPriority: "asc" }, { label: "asc" }],
      select: {
        id: true,
        key: true,
        label: true,
        description: true,
        iconUrl: true,
        rarity: true,
        category: true,
        isHidden: true,
        progressTarget: true,
      },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, awardedAt: true },
    }),
  ]);

  const earnedAt = new Map(earnedRows.map((r) => [r.badgeId, r.awardedAt]));

  let score = 0;
  let earnedCount = 0;
  let latest: AchievementsSummary["latest"] = null;

  const byCategory = new Map<BadgeCategory, BadgeView[]>();
  for (const b of badges) {
    const awardedAt = earnedAt.get(b.id) ?? null;
    const earned = awardedAt != null;
    const rarity = b.rarity as BadgeRarity;
    if (earned) {
      earnedCount++;
      score += RARITY_WEIGHT[rarity];
      if (!latest || awardedAt! > latest.awardedAt) {
        latest = { label: b.label, iconUrl: b.iconUrl, awardedAt: awardedAt! };
      }
    }
    const view: BadgeView = {
      key: b.key,
      label: b.label,
      description: b.description,
      iconUrl: b.iconUrl,
      rarity,
      isHidden: b.isHidden,
      earned,
      awardedAt,
      requirement: !earned && b.progressTarget ? `Target: ${b.progressTarget.toLocaleString("en-IN")}` : null,
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

  const totalCount = badges.length;
  return {
    score,
    earnedCount,
    totalCount,
    completionPct: totalCount ? Math.round((earnedCount / totalCount) * 100) : 0,
    latest,
    categories,
  };
}
