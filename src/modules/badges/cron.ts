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
