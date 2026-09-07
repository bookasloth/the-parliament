import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/modules/notifications/service"
import { enqueueOutbox } from "@/modules/outbox/enqueue"

/** Recipients notified per drain tick before the fan-out re-queues a continuation
 *  (audit IP-5). Bounds one invocation so a large audience never hits the 60s
 *  function ceiling and there's no fixed recipient cap. */
const INVITE_PAGE = 500

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
      // Hand the actual send-out to the outbox (audit IP-5): enqueue the first
      // recipient page; the drain delivers it in bounded chunks and re-queues
      // continuations. The wave flips to "sent" (= dispatched) immediately so a
      // later cron tick won't re-enqueue it; sentCount fills in as chunks drain.
      await enqueueOutbox({ type: "fanout_event_invite", payload: { eventId: wave.eventId, tier: wave.tier } })
      await prisma.eventInviteWave.update({
        where: { id: wave.id },
        data: { status: "sent", sentAt: new Date(), sentCount: 0 },
      })
    } catch (e) {
      console.error(`event invite wave ${wave.id} failed`, e)
      await prisma.eventInviteWave.update({ where: { id: wave.id }, data: { status: "failed" } })
    }
  }
  // recipients is delivered asynchronously by the outbox now, so it's not known here.
  return { waves: due.length, recipients }
}

/**
 * Deliver ONE page of an invite wave, then re-enqueue a continuation if more
 * recipients remain (audit IP-5 fan-out handler). Keyset-paginated by user id so
 * pages never overlap or skip. Replaces the old inline 5000-cap serial loop:
 * an arbitrarily large audience now delivers across drain ticks with no cap and
 * no 60s-timeout risk. At-least-once is safe here — a re-sent page coalesces into
 * the recipient's existing `new_event_in_batch` row (no duplicate bell).
 */
export async function sendEventInviteChunk(input: {
  eventId: string
  tier: string
  cursor?: string | null
  pageSize?: number
}): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: { title: true, status: true },
  })
  // Skip if the event was cancelled/unpublished after scheduling.
  if (!event || event.status !== "published") return
  const statuses = statusesForTier(input.tier)
  if (!statuses.length) return

  const pageSize = input.pageSize ?? INVITE_PAGE
  const base = process.env.AUTH_URL || "https://nnawca.org"
  const eventUrl = `${base}/events/${input.eventId}`
  const recipients = await prisma.user.findMany({
    where: {
      status: "active",
      memberType: { notIn: ["student", "bot", "system"] }, // never invite bots (fake @bots.internal emails)
      membershipStatus: { in: statuses },
      email: { not: "" },
      ...(input.cursor ? { id: { gt: input.cursor } } : {}),
    },
    orderBy: { id: "asc" },
    take: pageSize,
    select: { id: true },
  })
  if (recipients.length === 0) return

  for (const r of recipients) {
    await sendNotification({
      userId: r.id,
      kind: "new_event_in_batch",
      title: `New alumni event: ${event.title}`,
      entityType: "event",
      entityId: input.eventId,
      email: { eventTitle: event.title, eventUrl },
    }).catch((e) => console.error(`event invite send failed for ${r.id}`, e))
  }

  // Running tally on the wave (best-effort display; no wave row in ad-hoc sends).
  await prisma.eventInviteWave
    .updateMany({ where: { eventId: input.eventId, tier: input.tier }, data: { sentCount: { increment: recipients.length } } })
    .catch(() => {})

  // A full page means there may be more — continue from the last id next tick.
  if (recipients.length === pageSize) {
    await enqueueOutbox({
      type: "fanout_event_invite",
      payload: { eventId: input.eventId, tier: input.tier, cursor: recipients[recipients.length - 1].id, pageSize },
    })
  }
}
