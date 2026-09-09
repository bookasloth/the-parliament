import { prisma } from "@/lib/prisma";
import type { BadgeCriteria } from "@/config/badges";
import { currentStreak } from "./evaluate";

/**
 * Metric registry — one function per `metric` key used in the badge catalogue.
 * Each returns a user's current value for that metric (window/uniqueness applied
 * here, per the criteria). The pure matcher (`evaluate.ts`) then compares it to
 * the target. A metric absent from this registry → its badges are skipped
 * (logged once) rather than crashing the handler.
 *
 * Money note: `Donation` has no amount column (amount lives on the writer-less
 * `Payment` table), so all ₹ metrics use `Contribution.amountPaise` where paid.
 */
export interface MetricCtx {
  user: { id: string; createdAt: Date; profileCompletion: number };
}
export type MetricFn = (userId: string, c: BadgeCriteria, ctx: MetricCtx) => Promise<number>;

const DAY_MS = 86_400_000;
const cutoff365 = () => new Date(Date.now() - 365 * DAY_MS);

/** Only these post statuses count as real content. */
const VISIBLE = "visible" as const;

export const METRICS: Record<string, MetricFn> = {
  account_created: async () => 1,

  profile_completion: async (_u, _c, ctx) => ctx.user.profileCompletion,

  reactions_given: async (userId) =>
    prisma.reaction.count({ where: { userId, type: "upvote" } }),

  comments_written: async (userId) =>
    prisma.comment.count({ where: { authorId: userId, deletedAt: null } }),

  following_count: async (userId) => prisma.follow.count({ where: { followerId: userId } }),

  posts_created: async (userId, c) =>
    prisma.post.count({
      where: {
        authorId: userId,
        status: VISIBLE,
        deletedAt: null,
        repostOfId: null,
        ...(c.window === "rolling_365d" ? { createdAt: { gte: cutoff365() } } : {}),
      },
    }),

  comment_upvotes_received: async (userId) => {
    const r = await prisma.comment.aggregate({
      where: { authorId: userId, deletedAt: null },
      _sum: { likeCount: true },
    });
    return r._sum.likeCount ?? 0;
  },

  post_upvotes_received: async (userId) => {
    const r = await prisma.post.aggregate({
      where: { authorId: userId, status: VISIBLE, deletedAt: null },
      _sum: { upvoteCount: true },
    });
    return r._sum.upvoteCount ?? 0;
  },

  awards_received: async (userId) =>
    prisma.postAward.count({ where: { post: { authorId: userId } } }),

  active_membership: async (userId) =>
    (await prisma.membership.count({ where: { userId, startedAt: { gte: cutoff365() } } })) > 0 ? 1 : 0,

  donations_sum_inr: async (userId) => {
    const r = await prisma.contribution.aggregate({
      where: { userId, status: "paid", paidAt: { gte: cutoff365() } },
      _sum: { amountPaise: true },
    });
    return Math.floor((r._sum.amountPaise ?? 0) / 100);
  },

  contributions_count: async (userId) =>
    prisma.contribution.count({ where: { userId, status: "paid" } }),

  saved_posts: async (userId) => prisma.savedPost.count({ where: { userId } }),

  poll_votes: async (userId) =>
    prisma.pollVote.count({ where: { userId, votedAt: { gte: cutoff365() } } }),

  karma_redemptions: async (userId) => prisma.karmaRedemption.count({ where: { userId } }),

  // Relaxed from "new users" to distinct targets (no reliable per-throw signup age).
  eggs_thrown_new_users: async (userId) => {
    const rows = await prisma.eggThrow.findMany({
      where: { throwerId: userId },
      distinct: ["targetId"],
      select: { targetId: true },
    });
    return rows.length;
  },

  eggs_received: async (userId) => prisma.eggThrow.count({ where: { targetId: userId } }),

  reports_actioned: async (userId) =>
    prisma.contentReport.count({ where: { reporterId: userId, status: "actioned" } }),

  first_post_delay_days: async (userId, _c, ctx) => {
    const first = await prisma.post.findFirst({
      where: { authorId: userId, status: VISIBLE, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (!first) return 0; // no post yet → not unlocked
    return Math.floor((first.createdAt.getTime() - ctx.user.createdAt.getTime()) / DAY_MS);
  },

  upvotes_given_zero_comments: async (userId) => {
    const comments = await prisma.comment.count({ where: { authorId: userId, deletedAt: null } });
    if (comments > 0) return 0;
    return prisma.reaction.count({ where: { userId, type: "upvote" } });
  },

  owned_post_max_comments: async (userId) => {
    const r = await prisma.post.aggregate({
      where: { authorId: userId, status: VISIBLE, deletedAt: null },
      _max: { commentCount: true },
    });
    return r._max.commentCount ?? 0;
  },

  referrals_verified: async (userId) =>
    prisma.user.count({ where: { invitedById: userId, isVerified: true } }),

  posted_in_ist_window: async (userId, c) => {
    const start = Number((c.params as { startHour?: number })?.startHour ?? 0);
    const end = Number((c.params as { endHour?: number })?.endHour ?? 0);
    const rows = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n
      FROM posts
      WHERE author_id = ${userId}::uuid
        AND status = 'visible'
        AND deleted_at IS NULL
        AND EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Asia/Kolkata')) >= ${start}
        AND EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Asia/Kolkata')) < ${end}
    `;
    return Number(rows[0]?.n ?? 0);
  },

  // ── cron-only metrics (Phase 3) — registered so backfill/cron can use them ──
  lifetime_karma: async (userId) => {
    const k = await prisma.userKarma.findUnique({
      where: { userId },
      select: { lifetimeEarned: true },
    });
    return k ? Number(k.lifetimeEarned) : 0;
  },

  tenure_years: async (_u, _c, ctx) =>
    Math.floor((Date.now() - ctx.user.createdAt.getTime()) / (365 * DAY_MS)),

  profile_views_total: async (userId) => {
    const r = await prisma.profileView.aggregate({
      where: { profileUserId: userId },
      _sum: { count: true },
    });
    return r._sum.count ?? 0;
  },

  // Current consecutive-day streak of days the user EARNED karma (netKarma > 0),
  // in IST. Counts the run ending today or yesterday (so an in-progress day that
  // hasn't earned yet doesn't break the streak). Cron-only.
  karma_active_streak_days: async (userId) => {
    const rows = await prisma.karmaDailyCounter.findMany({
      where: { userId, netKarma: { gt: 0 } },
      orderBy: { dayIst: "desc" },
      take: 400,
      select: { dayIst: true },
    });
    if (rows.length === 0) return 0;
    const days = rows.map((r) => Math.floor(r.dayIst.getTime() / DAY_MS));
    const istYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const today = Math.floor(Date.parse(`${istYmd}T00:00:00Z`) / DAY_MS);
    return currentStreak(days, today);
  },

  // Distinct people followed who are in NEITHER the user's batch NOR house.
  connections_outside_batch_house: async (userId) => {
    const p = await prisma.profile.findUnique({
      where: { userId },
      select: { batchId: true, houseId: true },
    });
    if (!p?.batchId || !p?.houseId) return 0; // can't determine "outside" without both
    return prisma.follow.count({
      where: {
        followerId: userId,
        following: { profile: { batchId: { not: p.batchId }, houseId: { not: p.houseId } } },
      },
    });
  },
};
