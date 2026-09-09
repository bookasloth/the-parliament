import { prisma } from "@/lib/prisma";

/**
 * A user's unlock rank for each badge they've earned — i.e. the Nth person to
 * earn it (1 = first). One windowed query over just the badges this user holds.
 * Returns badgeId → rank.
 */
export async function unlockRanksForUser(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ badge_id: string; rnk: bigint }[]>`
    SELECT badge_id, rnk FROM (
      SELECT badge_id, user_id,
             RANK() OVER (PARTITION BY badge_id ORDER BY awarded_at ASC) AS rnk
      FROM user_badges
      WHERE badge_id IN (SELECT badge_id FROM user_badges WHERE user_id = ${userId}::uuid)
    ) t
    WHERE user_id = ${userId}::uuid
  `;
  return new Map(rows.map((r) => [r.badge_id, Number(r.rnk)]));
}

/** A single user's unlock rank for one badge (1 = first to earn it), or null. */
export async function unlockRankFor(userId: string, badgeId: string): Promise<number | null> {
  const me = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId } },
    select: { awardedAt: true },
  });
  if (!me) return null;
  const ahead = await prisma.userBadge.count({
    where: { badgeId, awardedAt: { lt: me.awardedAt } },
  });
  return ahead + 1;
}
