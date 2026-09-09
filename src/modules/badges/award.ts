import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/modules/notifications/service";
import { RARITY_WEIGHT, type BadgeRarity } from "@/config/badges";

export interface GrantInput {
  userId: string;
  badge: { id: string; label: string; rarity: BadgeRarity; iconUrl: string | null };
  source?: "auto" | "manual" | "backfill";
  /** Suppress the unlock notification (backfill). */
  notify?: boolean;
}

/**
 * Grant a badge idempotently. The (user_id, badge_id) PK makes the insert
 * once-only, so at-least-once redelivery from the outbox is safe: the score is
 * bumped and the notification sent ONLY on the insert that actually created the
 * row. Returns true if this call newly granted the badge.
 */
export async function grantBadge(input: GrantInput): Promise<boolean> {
  const { userId, badge } = input;
  const source = input.source ?? "auto";

  // Insert-or-ignore + score bump in one transaction. `skipDuplicates` returns 0
  // when the row already existed → we do nothing further (idempotent).
  const granted = await prisma.$transaction(async (tx) => {
    const res = await tx.userBadge.createMany({
      data: [{ userId, badgeId: badge.id, source }],
      skipDuplicates: true,
    });
    if (res.count === 0) return false;
    await tx.user.update({
      where: { id: userId },
      data: {
        achievementScore: { increment: RARITY_WEIGHT[badge.rarity] },
        badgeCount: { increment: 1 },
      },
    });
    return true;
  });

  if (granted && input.notify !== false) {
    // Best-effort; never block the grant on a notification failure.
    try {
      await sendNotification({
        userId,
        kind: "achievement_unlocked",
        title: "Achievement unlocked",
        body: `You earned the ${badge.label} badge.`,
        imageUrl: badge.iconUrl ?? undefined,
      });
    } catch {
      // swallow — the badge is already granted
    }
  }
  return granted;
}
