/**
 * Badge catalogue — single source of truth for the achievement system.
 *
 * The seed script (`scripts/seed-badges.ts`) upserts these into the `badges` table;
 * the award engine (`src/modules/badges/*`, Phase 1) reads the same definitions.
 *
 * A new badge that uses an EXISTING `metric` needs only an entry here + a re-seed —
 * no engine code. A new `metric` needs a query added to `src/modules/badges/metrics.ts`.
 *
 * Icon paths are repo-relative to `public/` (served at `/achievements/...`).
 * Art for the `milestones` category is user-supplied; until the PNGs land those
 * badges fall back to the panel's BADGE_FALLBACK.
 */

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type BadgeCategory =
  | "getting_started"
  | "contributor"
  | "commentator"
  | "engagement"
  | "supporter"
  | "growth"
  | "consistency"
  | "milestones"
  | "special"
  | "recognition";

export type BadgeAwardMode = "auto" | "manual";

/** Window over which a metric is measured. */
export type BadgeWindow =
  | "all_time"
  | "rolling_365d"
  | "calendar_year"
  | "ist_time_window"
  | "none";

/**
 * Mutation events that should re-evaluate a badge. `[]` = cron-only (time-based).
 * These strings are the `triggers` the outbox `evaluate_badges` handler matches on.
 */
export type BadgeTrigger =
  | "post_create"
  | "comment_create"
  | "comment_reaction"
  | "reaction"
  | "share"
  | "save"
  | "follow"
  | "poll_vote"
  | "award"
  | "egg_throw"
  | "referral_verified"
  | "membership"
  | "donation"
  | "contribution"
  | "report_actioned"
  | "redemption"
  | "karma";

export interface BadgeCriteria {
  /** Key into the metric-query registry (Phase 1 `metrics.ts`). */
  metric: string;
  op: ">=" | ">" | "==";
  target: number;
  window: BadgeWindow;
  /** Count distinct values of this dimension instead of raw rows (anti-gaming). */
  unique?: "counterparty" | "content" | null;
  /** Minimum account age before the badge can unlock. */
  minAccountAgeDays?: number;
  /** Mutation events that trigger re-evaluation. Empty = cron-only. */
  triggers: BadgeTrigger[];
  /** Metric-specific params (e.g. IST hour window). */
  params?: Record<string, unknown>;
}

export interface BadgeDef {
  key: string;
  label: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  iconUrl: string;
  awardMode: BadgeAwardMode;
  isHidden?: boolean;
  seriesKey?: string;
  seriesOrder?: number;
  /** Only for awardMode "auto". */
  criteria?: BadgeCriteria;
}

/** Achievement-score weight per rarity. */
export const RARITY_WEIGHT: Record<BadgeRarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 7,
  epic: 15,
  legendary: 30,
};

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  getting_started: "Getting Started",
  contributor: "Contributor",
  commentator: "Commentator",
  engagement: "Engagement",
  supporter: "Supporter",
  growth: "Growth",
  consistency: "Consistency",
  milestones: "Milestones",
  special: "Special",
  recognition: "Recognition",
};

/** Display order of categories in the UI. */
export const CATEGORY_ORDER: BadgeCategory[] = [
  "getting_started",
  "contributor",
  "commentator",
  "engagement",
  "supporter",
  "growth",
  "consistency",
  "milestones",
  "special",
  "recognition",
];

const ICON = "/achievements/badges";

export const BADGE_CATALOG: BadgeDef[] = [
  // ── 🏁 Getting Started ──────────────────────────────────────────────
  {
    key: "new_sailor",
    label: "New Sailor",
    description: "Registered your NNAWCA account.",
    category: "getting_started",
    rarity: "common",
    iconUrl: `${ICON}/onboarding/bouquet.png`,
    awardMode: "auto",
    criteria: { metric: "account_created", op: ">=", target: 1, window: "none", triggers: ["karma"] },
  },
  {
    key: "profile_complete",
    label: "Profile Complete",
    description: "Filled out your full profile.",
    category: "getting_started",
    rarity: "common",
    iconUrl: `${ICON}/onboarding/all.png`,
    awardMode: "auto",
    criteria: { metric: "profile_completion", op: ">=", target: 100, window: "none", triggers: ["karma"] },
  },
  {
    key: "first_upvote",
    label: "First Upvote",
    description: "Gave your first upvote.",
    category: "getting_started",
    rarity: "common",
    iconUrl: `${ICON}/onboarding/thumbs-up.png`,
    awardMode: "auto",
    criteria: { metric: "reactions_given", op: ">=", target: 1, window: "all_time", triggers: ["reaction"] },
  },
  {
    key: "first_comment",
    label: "First Comment",
    description: "Posted your first comment.",
    category: "getting_started",
    rarity: "common",
    iconUrl: `${ICON}/onboarding/1-comment.png`,
    awardMode: "auto",
    criteria: { metric: "comments_written", op: ">=", target: 1, window: "all_time", triggers: ["comment_create"] },
  },
  {
    key: "first_connection",
    label: "First Connection",
    description: "Followed your first fellow alumnus.",
    category: "getting_started",
    rarity: "common",
    iconUrl: `${ICON}/onboarding/refer.png`,
    awardMode: "auto",
    criteria: { metric: "following_count", op: ">=", target: 1, window: "all_time", triggers: ["follow"] },
  },
  {
    key: "social_linked",
    label: "Social Linked",
    description: "Connected a social account to your profile.",
    category: "getting_started",
    rarity: "uncommon",
    iconUrl: `${ICON}/onboarding/social-linked.png`,
    awardMode: "manual", // no social-link feature yet
  },

  // ── ✍️ Contributor (rolling 365d posts) ─────────────────────────────
  ...[
    ["starter", "Starter Poster", 10, "common", `${ICON}/contributor/yearly-starter.png`],
    ["rising", "Rising Contributor", 20, "common", `${ICON}/contributor/yearly-rising.png`],
    ["active", "Active Contributor", 50, "uncommon", `${ICON}/contributor/yearly-active.png`],
    ["dedicated", "Dedicated Contributor", 100, "rare", `${ICON}/contributor/yearly-dedicated.png`],
    ["power", "Power Poster", 200, "epic", `${ICON}/contributor/yearly-power.png`],
    ["elite", "Elite Poster", 500, "legendary", `${ICON}/contributor/yearly-elite.png`],
  ].map(([k, label, target, rarity, icon], i): BadgeDef => ({
    key: `contributor_${k}`,
    label: label as string,
    description: `Created ${target} posts in a year.`,
    category: "contributor",
    rarity: rarity as BadgeRarity,
    iconUrl: icon as string,
    awardMode: "auto",
    seriesKey: "posts",
    seriesOrder: i + 1,
    criteria: { metric: "posts_created", op: ">=", target: target as number, window: "rolling_365d", triggers: ["post_create"] },
  })),

  // ── 💬 Commentator (comment upvotes received) ───────────────────────
  ...[
    ["bishop", "Bishop", 1, "common"],
    ["morrison", "Morrison", 10, "uncommon"],
    ["razdan", "Razdan", 20, "rare"],
    ["sapru", "Sapru", 50, "epic"],
    ["bhogale", "Bhogale", 75, "legendary"],
    ["shastri", "Shastri", 100, "legendary"],
  ].map(([k, label, target, rarity], i): BadgeDef => ({
    key: `commentator_${k}`,
    label: label as string,
    description: `Received ${target} upvotes across all your comments.`,
    category: "commentator",
    rarity: rarity as BadgeRarity,
    iconUrl: `${ICON}/upvotes/${k}.png`,
    awardMode: "auto",
    seriesKey: "comment_upvotes",
    seriesOrder: i + 1,
    criteria: { metric: "comment_upvotes_received", op: ">=", target: target as number, window: "all_time", triggers: ["comment_reaction"] },
  })),

  // ── ❤️ Engagement ───────────────────────────────────────────────────
  {
    key: "well_received",
    label: "Well Received",
    description: "Earned 100 upvotes across your posts.",
    category: "engagement",
    rarity: "uncommon",
    iconUrl: `${ICON}/upvotes/morrison.png`, // shares commentator art; swap when dedicated art exists
    awardMode: "auto",
    criteria: { metric: "post_upvotes_received", op: ">=", target: 100, window: "all_time", triggers: ["reaction"] },
  },
  {
    key: "decorated",
    label: "Decorated",
    description: "Received 10 awards on your posts.",
    category: "engagement",
    rarity: "rare",
    iconUrl: `${ICON}/special/hall-of-famer.png`, // placeholder until dedicated art
    awardMode: "auto",
    criteria: { metric: "awards_received", op: ">=", target: 10, window: "all_time", triggers: ["award"] },
  },

  // ── 🤝 Supporter ────────────────────────────────────────────────────
  {
    key: "paid_member",
    label: "Paid Member",
    description: "Held a paid membership in the last year.",
    category: "supporter",
    rarity: "common",
    iconUrl: `${ICON}/giver/paid-member.png`,
    awardMode: "auto",
    criteria: { metric: "active_membership", op: ">=", target: 1, window: "rolling_365d", triggers: ["membership"] },
  },
  ...[
    ["benefactor", "Benefactor", 100, "uncommon"],
    ["patron", "Patron", 1000, "rare"],
    ["philanthropist", "Philanthropist", 5000, "epic"],
    ["legendary_donor", "Legendary Donor", 10000, "legendary"],
  ].map(([k, label, target, rarity], i): BadgeDef => ({
    key: `donor_${k}`,
    label: label as string,
    description: `Donated ₹${(target as number).toLocaleString("en-IN")} in the last year.`,
    category: "supporter",
    rarity: rarity as BadgeRarity,
    iconUrl: `${ICON}/giver/${String(k).replace("_", "-")}.png`,
    awardMode: "auto",
    seriesKey: "donations",
    seriesOrder: i + 1,
    criteria: { metric: "donations_sum_inr", op: ">=", target: target as number, window: "rolling_365d", triggers: ["donation", "contribution"] },
  })),
  {
    key: "visionary_sponsor",
    label: "Visionary Sponsor",
    description: "Sponsored a NNAWCA development milestone.",
    category: "supporter",
    rarity: "legendary",
    iconUrl: `${ICON}/giver/visionary-sponsor.png`,
    awardMode: "manual",
  },

  // ── 🔥 Consistency (karma-active-day streaks, cron-only) ────────────
  ...[
    ["5_day", "5-Day Streak", 5, "common", "5-day-streak"],
    ["10_day", "10-Day Streak", 10, "uncommon", "10-day-streak"],
    ["5_week", "5-Week Streak", 35, "rare", "5-week-streak"],
    ["10_week", "10-Week Streak", 70, "epic", "10-week-streak"],
    ["5_month", "5-Month Streak", 150, "legendary", "5-month-streak"],
    ["10_month", "10-Month Streak", 300, "legendary", "10-month-streak"],
  ].map(([k, label, target, rarity, file], i): BadgeDef => ({
    key: `streak_${k}`,
    label: label as string,
    description: `Earned karma every day for ${label as string} running.`,
    category: "consistency",
    rarity: rarity as BadgeRarity,
    iconUrl: `${ICON}/streak/${file}.png`,
    awardMode: "auto",
    seriesKey: "streak",
    seriesOrder: i + 1,
    criteria: { metric: "karma_active_streak_days", op: ">=", target: target as number, window: "none", triggers: [] },
  })),

  // ── 🏆 Milestones (art user-supplied under badges/milestone/) ───────
  ...[
    ["one_year", "One Year In", 1, "uncommon", "one-year"],
    ["veteran", "Veteran", 3, "rare", "veteran"],
    ["founding_era", "Founding Era", 5, "epic", "founding-era"],
  ].map(([k, label, target, rarity, file], i): BadgeDef => ({
    key: `tenure_${k}`,
    label: label as string,
    description: `${target} year${(target as number) > 1 ? "s" : ""} on the platform.`,
    category: "milestones",
    rarity: rarity as BadgeRarity,
    iconUrl: `${ICON}/milestone/${file}.png`,
    awardMode: "auto",
    seriesKey: "tenure",
    seriesOrder: i + 1,
    criteria: { metric: "tenure_years", op: ">=", target: target as number, window: "none", triggers: [] },
  })),
  ...[
    ["poster", "Poster", 50, "common", "karma-poster"],
    ["poller", "Poller", 100, "uncommon", "karma-poller"],
    ["group_leader", "Group Leader", 250, "rare", "karma-group-leader"],
    ["mentor", "Mentor", 500, "epic", "karma-mentor"],
  ].map(([k, label, target, rarity, file], i): BadgeDef => ({
    key: `karma_${k}`,
    label: `Karma ${label as string}`,
    description: `Reached ${target} lifetime karma.`,
    category: "milestones",
    rarity: rarity as BadgeRarity,
    iconUrl: `${ICON}/milestone/${file}.png`,
    awardMode: "auto",
    seriesKey: "karma_level",
    seriesOrder: i + 1,
    criteria: { metric: "lifetime_karma", op: ">=", target: target as number, window: "none", triggers: ["karma"] },
  })),

  // ── ⭐ Special ───────────────────────────────────────────────────────
  {
    key: "librarian",
    label: "Librarian",
    description: "Saved 20 posts to your reading list.",
    category: "special",
    rarity: "common",
    iconUrl: `${ICON}/special/librarian.png`,
    awardMode: "auto",
    criteria: { metric: "saved_posts", op: ">=", target: 20, window: "all_time", triggers: ["save"] },
  },
  {
    key: "voter",
    label: "Voter",
    description: "Voted in a poll in the last year.",
    category: "special",
    rarity: "common",
    iconUrl: `${ICON}/special/voter.png`,
    awardMode: "auto",
    criteria: { metric: "poll_votes", op: ">=", target: 1, window: "rolling_365d", triggers: ["poll_vote"] },
  },
  {
    key: "bargainer",
    label: "Bargainer",
    description: "Spent karma in the reward store.",
    category: "special",
    rarity: "common",
    iconUrl: `${ICON}/special/bargainer.png`,
    awardMode: "auto",
    criteria: { metric: "karma_redemptions", op: ">=", target: 1, window: "all_time", triggers: ["redemption"] },
  },
  {
    key: "the_welcoming",
    label: "The Welcoming",
    description: "Welcomed 10 new alumni with an egg.",
    category: "special",
    rarity: "common",
    iconUrl: `${ICON}/special/the-welcoming.png`,
    awardMode: "auto",
    criteria: { metric: "eggs_thrown_new_users", op: ">=", target: 10, window: "all_time", unique: "counterparty", triggers: ["egg_throw"] },
  },
  {
    key: "chickened",
    label: "Chickened",
    description: "Received 20 eggs from other alumni.",
    category: "special",
    rarity: "uncommon",
    iconUrl: `${ICON}/special/chickened.png`,
    awardMode: "auto",
    criteria: { metric: "eggs_received", op: ">=", target: 20, window: "all_time", triggers: ["egg_throw"] },
  },
  {
    key: "nnawca_police",
    label: "NNAWCA Police",
    description: "Filed 10 reports that led to action.",
    category: "special",
    rarity: "uncommon",
    iconUrl: `${ICON}/special/nnawca-police.png`,
    awardMode: "auto",
    criteria: { metric: "reports_actioned", op: ">=", target: 10, window: "all_time", triggers: ["report_actioned"] },
  },
  {
    key: "wallflower",
    label: "Wallflower",
    description: "Lurked 180+ days before your first post.",
    category: "special",
    rarity: "uncommon",
    isHidden: true,
    iconUrl: `${ICON}/special/wallflower.png`,
    awardMode: "auto",
    criteria: { metric: "first_post_delay_days", op: ">=", target: 180, window: "none", triggers: ["post_create"] },
  },
  {
    key: "secret_admirer",
    label: "Secret Admirer",
    description: "Gave 100 upvotes without a single comment.",
    category: "special",
    rarity: "rare",
    isHidden: true,
    iconUrl: `${ICON}/special/secret-admirer.png`,
    awardMode: "auto",
    criteria: { metric: "upvotes_given_zero_comments", op: ">=", target: 100, window: "all_time", triggers: ["reaction"] },
  },
  {
    key: "gardener",
    label: "Gardener",
    description: "Grew a thread to 50+ comments.",
    category: "special",
    rarity: "rare",
    iconUrl: `${ICON}/special/gardener.png`,
    awardMode: "auto",
    criteria: { metric: "owned_post_max_comments", op: ">=", target: 50, window: "all_time", triggers: ["comment_create"] },
  },
  {
    key: "the_explorer",
    label: "The Explorer",
    description: "Connected with 20 alumni outside your batch and house.",
    category: "special",
    rarity: "rare",
    iconUrl: `${ICON}/special/the-explorer.png`,
    awardMode: "auto",
    criteria: { metric: "connections_outside_batch_house", op: ">=", target: 20, window: "all_time", unique: "counterparty", triggers: ["follow"] },
  },
  {
    key: "open_wallet",
    label: "The Open Wallet",
    description: "Made 10 separate contributions.",
    category: "special",
    rarity: "rare",
    iconUrl: `${ICON}/special/the-open-wallet.png`,
    awardMode: "auto",
    criteria: { metric: "contributions_count", op: ">=", target: 10, window: "all_time", triggers: ["contribution", "donation"] },
  },
  {
    key: "influencer",
    label: "Influencer",
    description: "20 alumni joined and verified via your referral.",
    category: "special",
    rarity: "epic",
    iconUrl: `${ICON}/special/influencer.png`,
    awardMode: "auto",
    criteria: { metric: "referrals_verified", op: ">=", target: 20, window: "all_time", unique: "counterparty", triggers: ["referral_verified"] },
  },
  {
    key: "early_riser",
    label: "Early Riser",
    description: "Posted between 5 and 8 AM IST.",
    category: "special",
    rarity: "common",
    isHidden: true,
    iconUrl: `${ICON}/special/early-riser.png`,
    awardMode: "auto",
    criteria: {
      metric: "posted_in_ist_window",
      op: ">=",
      target: 1,
      window: "ist_time_window",
      triggers: ["post_create"],
      params: { startHour: 5, endHour: 8 }, // [05:00, 08:00) IST
    },
  },
  {
    key: "night_owl",
    label: "Night Owl",
    description: "Posted between 1 and 4 AM IST.",
    category: "special",
    rarity: "common",
    isHidden: true,
    iconUrl: `${ICON}/special/night-owl.png`,
    awardMode: "auto",
    criteria: {
      metric: "posted_in_ist_window",
      op: ">=",
      target: 1,
      window: "ist_time_window",
      triggers: ["post_create"],
      params: { startHour: 1, endHour: 4 }, // [01:00, 04:00) IST
    },
  },
  {
    key: "the_legend",
    label: "The Legend",
    description: "Your profile has been viewed 1,095+ times.",
    category: "special",
    rarity: "legendary",
    iconUrl: `${ICON}/special/the-legend.png`,
    awardMode: "auto",
    criteria: { metric: "profile_views_total", op: ">=", target: 1095, window: "none", triggers: [] }, // lifetime approx, cron
  },
  {
    key: "meme_lord",
    label: "Meme Lord",
    description: "Landed a meme post at 50+ upvotes.",
    category: "special",
    rarity: "uncommon",
    iconUrl: `${ICON}/special/meme-lord.png`,
    awardMode: "manual", // no meme tag
  },
  {
    key: "bug_hunter",
    label: "Bug Hunter",
    description: "Found and reported a critical platform bug.",
    category: "special",
    rarity: "rare",
    iconUrl: `${ICON}/special/bug-hunter.png`,
    awardMode: "manual",
  },
  {
    key: "hall_of_famer",
    label: "Hall of Famer",
    description: "A post of yours made the community Hall of Fame.",
    category: "special",
    rarity: "epic",
    iconUrl: `${ICON}/special/hall-of-famer.png`,
    awardMode: "manual",
  },

  // ── 🎖 Recognition (committee — manual invite-only) ─────────────────
  ...[
    ["executive", "Executive Committee", "legendary"],
    ["sports", "Sports Committee", "epic"],
    ["cultural", "Cultural Committee", "epic"],
    ["developer", "Developer Committee", "legendary"],
  ].map(([k, label, rarity]): BadgeDef => ({
    key: `committee_${k}`,
    label: label as string,
    description: `Invite-only badge for ${label as string} members.`,
    category: "recognition",
    rarity: rarity as BadgeRarity,
    iconUrl: `${ICON}/committee/${k}.png`,
    awardMode: "manual",
  })),
];

/** Recompute a user's achievement score from a set of earned rarities. */
export function achievementScore(rarities: BadgeRarity[]): number {
  return rarities.reduce((sum, r) => sum + RARITY_WEIGHT[r], 0);
}
