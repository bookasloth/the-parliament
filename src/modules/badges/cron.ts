import { prisma } from "@/lib/prisma";
import { evaluateUserBadges } from "./evaluate-user";

const DAY_MS = 86_400_000;

/**
 * Daily badge sweep: re-evaluate ALL auto badges (event + cron/time-based) for
 * users active in the last ~2 IST days. Catches streak/tenure/window badges that
 * have no triggering mutation, plus any event badge a missed enqueue skipped
 * (the backstop). Idempotent. Bounded by the recently-active set.
 *
 * Fully-inactive users don't get time-based badges (e.g. tenure) here — those are
 * picked up on their next activity or by a full `backfillAllUsers` run.
 */
export async function evaluateRecentlyActive(): Promise<{ users: number }> {
  const istYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const since = new Date(Date.parse(`${istYmd}T00:00:00Z`) - DAY_MS); // yesterday + today

  const rows = await prisma.karmaDailyCounter.findMany({
    where: { dayIst: { gte: since } },
    distinct: ["userId"],
    select: { userId: true },
  });

  for (const { userId } of rows) {
    await evaluateUserBadges(userId, { mode: "all", notify: true });
  }
  return { users: rows.length };
}

/**
 * One-time backfill: grant existing members every badge they've already earned,
 * with notifications suppressed (no wake-up wave). Re-runnable (insert-or-ignore).
 * Pages through all non-deleted users.
 */
/**
 * Recompute every user's achievement_score + badge_count from LIVE rarity
 * (dynamic, by holder count). Set-based single statement. Rarity bands mirror
 * `deriveRarity()` and weights mirror `RARITY_WEIGHT` — keep them in sync.
 * Run nightly (grants bump an approximate score in between). Returns rows updated.
 */
export async function recomputeAchievementScores(): Promise<number> {
  return prisma.$executeRaw`
    WITH counts AS (
      SELECT badge_id, COUNT(*)::int AS c FROM user_badges GROUP BY badge_id
    ),
    weights AS (
      SELECT badge_id,
        CASE WHEN c < 12 THEN 30 WHEN c < 30 THEN 15 WHEN c < 60 THEN 7 WHEN c <= 100 THEN 3 ELSE 1 END AS w
      FROM counts
    ),
    scores AS (
      SELECT ub.user_id, SUM(w.w)::int AS score, COUNT(*)::int AS cnt
      FROM user_badges ub JOIN weights w ON w.badge_id = ub.badge_id
      GROUP BY ub.user_id
    )
    UPDATE users u
    SET achievement_score = s.score, badge_count = s.cnt
    FROM scores s
    WHERE u.id = s.user_id
      AND (u.achievement_score <> s.score OR u.badge_count <> s.cnt)
  `;
}

export async function backfillAllUsers(pageSize = 200): Promise<{ users: number; granted: number }> {
  let cursor: string | undefined;
  let users = 0;
  let granted = 0;
  for (;;) {
    const batch = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true },
    });
    if (batch.length === 0) break;
    for (const u of batch) {
      const res = await evaluateUserBadges(u.id, { mode: "all", notify: false });
      users++;
      granted += res.granted.length;
    }
    cursor = batch[batch.length - 1].id;
    if (batch.length < pageSize) break;
  }
  return { users, granted };
}
