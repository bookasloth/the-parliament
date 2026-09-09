import { prisma } from "@/lib/prisma";
import type { BadgeCriteria, BadgeRarity } from "@/config/badges";
import { METRICS, type MetricCtx } from "./metrics";
import { meetsCriteria } from "./evaluate";
import { grantBadge } from "./award";

export interface EvaluateOptions {
  /** "event" = only trigger-driven badges; "all" = include cron/time-based (backfill, cron). */
  mode?: "event" | "all";
  /** Suppress unlock notifications (backfill). */
  notify?: boolean;
}

const warnedMissing = new Set<string>();

/**
 * Evaluate a user's not-yet-earned auto badges and grant any that now pass.
 * Idempotent (grant is insert-or-ignore) so it's safe under outbox at-least-once
 * redelivery and re-runnable for backfill. Metrics not in the registry are
 * skipped (their badges simply don't unlock yet).
 */
export async function evaluateUserBadges(
  userId: string,
  opts: EvaluateOptions = {},
): Promise<{ granted: string[] }> {
  const mode = opts.mode ?? "event";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, createdAt: true, profileCompletion: true },
  });
  if (!user) return { granted: [] };
  const ctx: MetricCtx = { user };
  const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);

  const candidates = await prisma.badge.findMany({
    where: {
      awardMode: "auto",
      userBadges: { none: { userId } }, // not yet earned
    },
    select: { id: true, label: true, rarity: true, iconUrl: true, autoCriteria: true },
  });

  const granted: string[] = [];
  for (const b of candidates) {
    const criteria = b.autoCriteria as unknown as BadgeCriteria | null;
    if (!criteria) continue;

    // Event mode skips cron-only (no-trigger) badges.
    if (mode === "event" && criteria.triggers.length === 0) continue;

    const metric = METRICS[criteria.metric];
    if (!metric) {
      if (!warnedMissing.has(criteria.metric)) {
        warnedMissing.add(criteria.metric);
        console.warn(`[badges] no metric registered for "${criteria.metric}" — skipping its badges`);
      }
      continue;
    }

    let value: number;
    try {
      value = await metric(userId, criteria, ctx);
    } catch (e) {
      console.error(`[badges] metric "${criteria.metric}" failed for ${userId}`, e);
      continue;
    }

    if (meetsCriteria(criteria, value, accountAgeDays).unlocked) {
      const did = await grantBadge({
        userId,
        badge: { id: b.id, label: b.label, rarity: b.rarity as BadgeRarity, iconUrl: b.iconUrl },
        source: opts.notify === false ? "backfill" : "auto",
        notify: opts.notify,
      });
      if (did) granted.push(b.id);
    }
  }
  return { granted };
}
