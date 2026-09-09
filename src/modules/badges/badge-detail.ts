import { prisma } from "@/lib/prisma";
import { slugToKey } from "./slug";
import { unlockRankFor } from "./ranks";
import { deriveRarity } from "./rarity-dynamic";
import { taglineFor } from "@/config/badge-taglines";
import type { BadgeRarity } from "@/config/badges";

export interface BadgeEarner {
  rank: number;
  userId: string;
  username: string | null;
  name: string;
  photoUrl: string | null;
  houseName: string | null;
  houseColor: string | null;
  batchLabel: string | null;
  awardedAt: Date;
}

export interface BadgeDetail {
  key: string;
  label: string;
  description: string | null;
  iconUrl: string | null;
  rarity: BadgeRarity;
  category: string | null;
  isHidden: boolean;
  awardMode: string;
  requirement: string | null;
  tagline: string;
  totalEarned: number;
  viewerEarned: boolean;
  /** The viewer's own unlock rank (Nth to earn it), when earned. */
  viewerRank: number | null;
  earners: BadgeEarner[]; // ordered by unlock time (earliest first)
}

function batchLabel(b: { startYear: number | null; endYear: number | null; label: string | null } | null): string | null {
  if (!b) return null;
  if (b.label) return b.label;
  if (b.startYear && b.endYear) return `${b.startYear}–${b.endYear}`;
  return b.startYear ? String(b.startYear) : null;
}

/** Detail + unlock leaderboard (earliest first = "unlock rank") for one badge. */
export async function getBadgeDetail(slug: string, viewerId?: string): Promise<BadgeDetail | null> {
  const key = slugToKey(slug);
  const badge = await prisma.badge.findFirst({
    where: { key },
    select: {
      id: true, key: true, label: true, description: true, iconUrl: true,
      rarity: true, category: true, isHidden: true, awardMode: true, progressTarget: true,
    },
  });
  if (!badge) return null;

  const [rows, total] = await Promise.all([
    prisma.userBadge.findMany({
      where: { badgeId: badge.id },
      orderBy: { awardedAt: "asc" },
      take: 100,
      select: {
        awardedAt: true,
        user: {
          select: {
            id: true, username: true, displayName: true, legalName: true, deletedAt: true,
            profile: {
              select: {
                photoUrl: true,
                house: { select: { name: true, colorHex: true } },
                batch: { select: { startYear: true, endYear: true, label: true } },
              },
            },
          },
        },
      },
    }),
    prisma.userBadge.count({ where: { badgeId: badge.id } }),
  ]);

  const viewerRank = viewerId ? await unlockRankFor(viewerId, badge.id) : null;

  const earners: BadgeEarner[] = rows
    .filter((r) => !r.user.deletedAt)
    .map((r, i) => ({
      rank: i + 1,
      userId: r.user.id,
      username: r.user.username,
      name: r.user.displayName || r.user.legalName || "Alumnus",
      photoUrl: r.user.profile?.photoUrl ?? null,
      houseName: r.user.profile?.house?.name ?? null,
      houseColor: r.user.profile?.house?.colorHex ?? null,
      batchLabel: batchLabel(r.user.profile?.batch ?? null),
      awardedAt: r.awardedAt,
    }));

  return {
    key: badge.key,
    label: badge.label,
    description: badge.description,
    iconUrl: badge.iconUrl,
    rarity: deriveRarity(total),
    category: badge.category,
    isHidden: badge.isHidden,
    awardMode: badge.awardMode,
    requirement: badge.progressTarget ? `Target: ${badge.progressTarget.toLocaleString("en-IN")}` : null,
    tagline: taglineFor(badge.key),
    totalEarned: total,
    viewerEarned: viewerRank != null,
    viewerRank,
    earners,
  };
}
