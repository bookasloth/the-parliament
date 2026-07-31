import type { PgBoss } from "pg-boss"
import { prisma } from "@/lib/prisma"
import { getBoss, QUEUE } from "@/lib/jobs"
import { sendNotification } from "@/modules/notifications/service"

// Priority invite waves: the best members hear first, each tier 2 hours after
// the previous one. Membership tiers map to the User.membershipStatus values.
export interface InviteWave {
  tier: string
  statuses: string[]
  delaySeconds: number
}

const HOUR = 3600

export const EVENT_INVITE_WAVES: InviteWave[] = [
  { tier: "life", statuses: ["life", "committee"], delaySeconds: 0 },
  { tier: "premium", statuses: ["premium"], delaySeconds: 2 * HOUR },
  { tier: "associate", statuses: ["associate"], delaySeconds: 4 * HOUR },
  { tier: "student", statuses: ["student"], delaySeconds: 6 * HOUR },
]

export function statusesForTier(tier: string): string[] {
  return EVENT_INVITE_WAVES.find((w) => w.tier === tier)?.statuses ?? []
}

/**
 * Schedule the staggered invite waves for an event. singletonKey per event+tier
 * makes a double-click (or duplicate call) a no-op instead of a second blast.
 */
export async function scheduleEventInvites(eventId: string): Promise<void> {
  const boss = await getBoss()
  for (const w of EVENT_INVITE_WAVES) {
    await boss.sendAfter(
      QUEUE.EVENT_INVITE,
      { eventId, tier: w.tier },
      { singletonKey: `event-invite-${eventId}-${w.tier}` },
      w.delaySeconds,
    )
  }
}

export async function registerEventJobs(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE.EVENT_INVITE)
  await boss.work<{ eventId: string; tier: string }>(QUEUE.EVENT_INVITE, async (jobs) => {
    for (const job of jobs) await runInviteWave(job.data.eventId, job.data.tier)
  })
}

async function runInviteWave(eventId: string, tier: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, status: true },
  })
  // Skip if the event was cancelled/unpublished between scheduling and firing.
  if (!event || event.status !== "published") return
  const statuses = statusesForTier(tier)
  if (!statuses.length) return

  const base = process.env.AUTH_URL || "https://nnawca.org"
  const eventUrl = `${base}/events/${eventId}`
  // Registered members of this tier who aren't current students of the school.
  const recipients = await prisma.user.findMany({
    where: {
      status: "active",
      memberType: { not: "student" },
      membershipStatus: { in: statuses },
      email: { not: "" },
    },
    select: { id: true },
  })
  for (const r of recipients) {
    await sendNotification({
      userId: r.id,
      kind: "new_event_in_batch",
      title: `New alumni event: ${event.title}`,
      entityType: "event",
      entityId: eventId,
      email: { eventTitle: event.title, eventUrl },
    }).catch((e) => console.error(`event invite failed for ${r.id}`, e))
  }
}
