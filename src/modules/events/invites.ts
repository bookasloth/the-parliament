import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/modules/notifications/service"

// Priority invite waves: best members hear first, each tier 2 hours after the
// previous. Tiers map to User.membershipStatus values.
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

/** sendAfter timestamp for each wave, given a base time (schedule moment). */
export function waveSchedule(now: number): { tier: string; sendAfter: Date }[] {
  return EVENT_INVITE_WAVES.map((w) => ({ tier: w.tier, sendAfter: new Date(now + w.delaySeconds * 1000) }))
}

/**
 * Schedule the staggered invite waves for an event. Idempotent: the
 * @@unique([eventId, tier]) + upsert means a double-click just refreshes the
 * (still-pending) rows rather than creating duplicates or re-sending.
 */
export async function scheduleEventInvites(eventId: string, now: number = Date.now()): Promise<void> {
  for (const { tier, sendAfter } of waveSchedule(now)) {
    await prisma.eventInviteWave.upsert({
      where: { eventId_tier: { eventId, tier } },
      create: { eventId, tier, sendAfter, status: "pending" },
      // Only reschedule waves that haven't gone out yet.
      update: {},
    })
  }
}

/**
 * Send every wave that's due (pending + sendAfter <= now). Called by the
 * event-invites cron (frequent) and, as a fallback, by the daily membership
 * cron. Marks each wave sent so it never double-fires.
 */
export async function processDueInviteWaves(now: Date = new Date()): Promise<{ waves: number; recipients: number }> {
  const due = await prisma.eventInviteWave.findMany({
    where: { status: "pending", sendAfter: { lte: now } },
    orderBy: { sendAfter: "asc" },
    take: 50,
  })

  let recipients = 0
  for (const wave of due) {
    // Claim the wave first so a concurrent cron run can't send it twice.
    const claimed = await prisma.eventInviteWave.updateMany({
      where: { id: wave.id, status: "pending" },
      data: { status: "sending" },
    })
    if (claimed.count === 0) continue

    try {
      const sent = await sendWave(wave.eventId, wave.tier)
      recipients += sent
      await prisma.eventInviteWave.update({
        where: { id: wave.id },
        data: { status: "sent", sentAt: new Date(), sentCount: sent },
      })
    } catch (e) {
      console.error(`event invite wave ${wave.id} failed`, e)
      await prisma.eventInviteWave.update({ where: { id: wave.id }, data: { status: "failed" } })
    }
  }
  return { waves: due.length, recipients }
}

async function sendWave(eventId: string, tier: string): Promise<number> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, status: true },
  })
  // Skip if the event was cancelled/unpublished after scheduling.
  if (!event || event.status !== "published") return 0
  const statuses = statusesForTier(tier)
  if (!statuses.length) return 0

  const base = process.env.AUTH_URL || "https://nnawca.org"
  const eventUrl = `${base}/events/${eventId}`
  // Members of this tier who aren't current students of the school.
  // ponytail: capped per wave; a single-school base is well under this.
  const recipients = await prisma.user.findMany({
    where: {
      status: "active",
      memberType: { not: "student" },
      membershipStatus: { in: statuses },
      email: { not: "" },
    },
    select: { id: true },
    take: 5000,
  })

  for (const r of recipients) {
    await sendNotification({
      userId: r.id,
      kind: "new_event_in_batch",
      title: `New alumni event: ${event.title}`,
      entityType: "event",
      entityId: eventId,
      email: { eventTitle: event.title, eventUrl },
    }).catch((e) => console.error(`event invite send failed for ${r.id}`, e))
  }
  return recipients.length
}
