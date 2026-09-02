import { prisma } from "@/lib/prisma"
import type { EventRsvpStatus } from "@/generated/prisma/enums"
import { sendEmail } from "@/lib/email"
import { sendNotification } from "@/modules/notifications/service"

/** In-app ping to an event's host when someone RSVPs "going" (audit P1-3). */
async function notifyHostOfRsvp(userId: string, eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { hostId: true, title: true },
  })
  if (!event || event.hostId === userId) return
  const attendee = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, legalName: true },
  })
  const fromName = attendee?.displayName || attendee?.legalName || "Someone"
  await sendNotification({
    userId: event.hostId,
    kind: "event_rsvp",
    title: `${fromName} is going to ${event.title}`,
    entityType: "event",
    entityId: eventId,
    sendEmail: false,
  })
}

/** EventItem shape consumed by the events client UI. Mirrors the mock array. */
export interface EventItem {
  id: string
  slug: string
  title: string
  date: string
  time: string
  mode: "in-person" | "virtual" | "hybrid"
  cover: string
  isFree: boolean
  price?: number
  interested: boolean
  category: string
  isPast?: boolean
}

/** Map schema mode ("online") to the UI union ("virtual"). */
function mapMode(mode: string): EventItem["mode"] {
  if (mode === "online") return "virtual"
  if (mode === "hybrid") return "hybrid"
  return "in-person"
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

/**
 * Shared, non-per-viewer event list (interested=false baseline). Safe to
 * cache across viewers; the per-user `interested` overlay is applied by
 * `listEvents` / the page via `myInterestedEventIds`.
 */
export async function listEventsShared(schoolId: string): Promise<EventItem[]> {
  const events = await prisma.event.findMany({
    where: { schoolId, status: "published" },
    orderBy: { startsAt: "asc" },
  })
  const now = new Date()
  return events.map((e) => ({
    id: e.id,
    slug: e.id,
    title: e.title,
    date: formatDate(e.startsAt),
    time: formatTime(e.startsAt),
    mode: mapMode(e.mode),
    cover: e.bannerUrl ?? "",
    isFree: e.priceInPaise <= 0,
    price: e.priceInPaise > 0 ? e.priceInPaise / 100 : undefined,
    interested: false,
    category: e.mode || "General",
    isPast: e.startsAt < now,
  }))
}

/**
 * Event ids the user has a "going" RSVP for (per-viewer overlay). Matches the
 * prior behavior: only "going" flips the UI's `interested` flag (the old code
 * also OR'd a non-existent "interested" status, which never matched).
 */
export async function myInterestedEventIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.eventRsvp.findMany({
    where: { userId, status: "going" },
    select: { eventId: true },
  })
  return new Set(rows.map((r) => r.eventId))
}

/**
 * List published events for a school. `userId` resolves the per-user
 * `interested` flag. Composed from the cacheable shared list + a per-viewer
 * RSVP overlay so callers that can cache the shared half (the events page) do.
 */
export async function listEvents(
  schoolId: string,
  userId: string | null,
): Promise<EventItem[]> {
  const shared = await listEventsShared(schoolId)
  if (!userId) return shared
  const going = await myInterestedEventIds(userId)
  return shared.map((e) => (going.has(e.id) ? { ...e, interested: true } : e))
}

/** Upsert an RSVP for the given user/event. */
export async function rsvpEvent(
  userId: string,
  eventId: string,
  status: EventRsvpStatus = "going",
) {
  const existing = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })
  const row = await prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, status },
    update: { status },
  })
  // Confirmation only on a fresh "going" RSVP — not on status re-toggles.
  if (!existing && status === "going") {
    // Pass ids as separate args, never interpolated into the format string
    // (user-controlled eventId → tainted-format-string / log-injection).
    await sendRsvpConfirmation(userId, eventId).catch((e) =>
      console.error("rsvp confirmation email failed", { userId, eventId }, e),
    )
    // Notify the host that someone is coming (audit P1-3 — RSVPs notified only
    // the attendee, never the host). In-app only; coalesced per event.
    await notifyHostOfRsvp(userId, eventId).catch(() => {})
  }
  return row
}

async function sendRsvpConfirmation(userId: string, eventId: string): Promise<void> {
  const [user, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, legalName: true } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { title: true, startsAt: true } }),
  ])
  if (!user?.email || !event) return
  const base = process.env.AUTH_URL || "https://nnawca.org"
  await sendEmail(
    "rsvp_confirmed",
    user.email,
    {
      firstName: user.legalName?.split(" ")[0] || "there",
      eventTitle: event.title,
      eventWhen: event.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      eventUrl: `${base}/events/${eventId}`,
    },
    userId,
  )
}

/** Remove a user's RSVP for an event. */
export async function cancelRsvp(userId: string, eventId: string) {
  return prisma.eventRsvp.deleteMany({ where: { eventId, userId } })
}

/**
 * Email a "your event is tomorrow" reminder to every "going" attendee of any
 * published event starting in the next ~24–48h. Idempotent per event via
 * `reminderSentAt` — the marker is claimed atomically before the fan-out, so a
 * second cron tick (hourly GH Actions + daily Vercel) can't double-send. Called
 * from the event-invites cron.
 */
export async function sendEventReminders(now: Date = new Date()): Promise<{ events: number; emails: number }> {
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const events = await prisma.event.findMany({
    where: { status: "published", reminderSentAt: null, startsAt: { gte: windowStart, lt: windowEnd } },
    select: { id: true, title: true, startsAt: true },
  })
  const base = process.env.AUTH_URL || "https://nnawca.org"
  let emails = 0
  for (const e of events) {
    // Claim the event first; skip if another tick already claimed it (count 0).
    const claim = await prisma.event.updateMany({
      where: { id: e.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    })
    if (claim.count === 0) continue

    const rsvps = await prisma.eventRsvp.findMany({
      where: { eventId: e.id, status: "going" },
      select: { userId: true, user: { select: { email: true, legalName: true } } },
    })
    const when = e.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    for (const r of rsvps) {
      if (!r.user.email) continue
      await sendEmail(
        "event_reminder",
        r.user.email,
        { firstName: r.user.legalName?.split(" ")[0] || "there", eventTitle: e.title, eventWhen: when, eventUrl: `${base}/events/${e.id}` },
        r.userId,
      ).catch((err) => console.error(`event_reminder email failed for ${r.userId}`, err))
      emails++
    }
  }
  return { events: events.length, emails }
}

// ── Admin reporting ──

export interface EventReportRow {
  id: string
  title: string
  startsAt: string
  isPast: boolean
  priceInPaise: number
  going: number
  interested: number
  checkedIn: number
  revenuePaise: number
  feedbackCount: number
  feedbackAvg: number | null
}

/**
 * Per-event attendance + feedback + revenue rollup for the admin console.
 * Revenue = sum of PAID event orders (free events contribute 0).
 */
export async function getEventReports(schoolId: string): Promise<EventReportRow[]> {
  const events = await prisma.event.findMany({
    where: { schoolId },
    orderBy: { startsAt: "desc" },
    select: { id: true, title: true, startsAt: true, priceInPaise: true },
  })
  if (events.length === 0) return []
  const ids = events.map((e) => e.id)
  const now = new Date()

  const [going, checkedIn, revenue, fbCount, fbAvg] = await Promise.all([
    prisma.eventRsvp.groupBy({ by: ["eventId", "status"], where: { eventId: { in: ids } }, _count: true }),
    prisma.eventAttendance.groupBy({ by: ["eventId"], where: { eventId: { in: ids }, checkedInAt: { not: null } }, _count: true }),
    prisma.eventOrder.groupBy({ by: ["eventId"], where: { eventId: { in: ids }, status: "paid" }, _sum: { amountPaise: true } }),
    prisma.eventFeedback.groupBy({ by: ["eventId"], where: { eventId: { in: ids } }, _count: true }),
    prisma.eventFeedback.groupBy({ by: ["eventId"], where: { eventId: { in: ids } }, _avg: { rating: true } }),
  ])

  const goingMap = new Map<string, number>()
  const interestedMap = new Map<string, number>()
  for (const g of going) {
    if (g.status === "going") goingMap.set(g.eventId, g._count)
    else if (g.status === "maybe") interestedMap.set(g.eventId, g._count)
  }
  const checkedMap = new Map(checkedIn.map((c) => [c.eventId, c._count]))
  const revMap = new Map(revenue.map((r) => [r.eventId, r._sum.amountPaise ?? 0]))
  const fbCountMap = new Map(fbCount.map((f) => [f.eventId, f._count]))
  const fbAvgMap = new Map(fbAvg.map((f) => [f.eventId, f._avg.rating]))

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.startsAt.toISOString(),
    isPast: e.startsAt < now,
    priceInPaise: e.priceInPaise,
    going: goingMap.get(e.id) ?? 0,
    interested: interestedMap.get(e.id) ?? 0,
    checkedIn: checkedMap.get(e.id) ?? 0,
    revenuePaise: revMap.get(e.id) ?? 0,
    feedbackCount: fbCountMap.get(e.id) ?? 0,
    feedbackAvg: fbAvgMap.get(e.id) ?? null,
  }))
}

// ── Admin console list ──

export type AdminEventStatus = "upcoming" | "draft" | "past" | "cancelled"

export interface AdminEventRow {
  id: string
  title: string
  category: string
  mode: "in-person" | "virtual" | "hybrid"
  date: string
  organizer: string
  going: number
  revenuePaise: number
  isFree: boolean
  status: AdminEventStatus
  featured: boolean
}

/** Derive the admin list status from the DB status + start time. Pure. */
export function deriveEventStatus(
  status: string,
  startsAt: Date,
  now: Date,
): AdminEventStatus {
  if (status === "draft") return "draft"
  if (status === "cancelled") return "cancelled"
  if (status === "completed") return "past"
  // published
  return startsAt >= now ? "upcoming" : "past"
}

/**
 * Every event with its host, going-count, and paid revenue — for /admin/events.
 * Global (all schools) since the admin console is cross-school.
 */
export async function getAdminEventRows(): Promise<AdminEventRow[]> {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true, title: true, mode: true, startsAt: true, status: true,
      isFeatured: true, priceInPaise: true,
      host: { select: { legalName: true, displayName: true, username: true } },
    },
  })
  if (events.length === 0) return []
  const ids = events.map((e) => e.id)
  const now = new Date()

  const [going, revenue] = await Promise.all([
    prisma.eventRsvp.groupBy({ by: ["eventId"], where: { eventId: { in: ids }, status: "going" }, _count: true }),
    prisma.eventOrder.groupBy({ by: ["eventId"], where: { eventId: { in: ids }, status: "paid" }, _sum: { amountPaise: true } }),
  ])
  const goingMap = new Map(going.map((g) => [g.eventId, g._count]))
  const revMap = new Map(revenue.map((r) => [r.eventId, r._sum.amountPaise ?? 0]))

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.mode === "online" ? "Online" : "In-person",
    mode: mapMode(e.mode),
    date: formatDate(e.startsAt),
    organizer: e.host.displayName || e.host.legalName || e.host.username || "—",
    going: goingMap.get(e.id) ?? 0,
    revenuePaise: revMap.get(e.id) ?? 0,
    isFree: e.priceInPaise <= 0,
    status: deriveEventStatus(e.status, e.startsAt, now),
    featured: e.isFeatured,
  }))
}

// ── Attendance (host-facing check-in) ──

export interface AttendeeRow {
  userId: string
  name: string
  username: string | null
  checkedIn: boolean
}

/** Attendees (users with a "going" RSVP) + their check-in state, for the host. */
export async function listEventAttendees(eventId: string): Promise<AttendeeRow[]> {
  const [rsvps, attendance] = await Promise.all([
    prisma.eventRsvp.findMany({
      where: { eventId, status: "going" },
      select: {
        userId: true,
        rsvpAt: true,
        user: { select: { legalName: true, displayName: true, username: true } },
      },
      orderBy: { rsvpAt: "asc" },
    }),
    prisma.eventAttendance.findMany({
      where: { eventId, checkedInAt: { not: null } },
      select: { userId: true },
    }),
  ])
  const checked = new Set(attendance.map((a) => a.userId))
  return rsvps.map((r) => ({
    userId: r.userId,
    name: r.user.displayName || r.user.legalName,
    username: r.user.username,
    checkedIn: checked.has(r.userId),
  }))
}

/** Toggle a single attendee's check-in. Sets checkedInAt to now or clears it. */
export async function setCheckIn(eventId: string, userId: string, checkedIn: boolean) {
  return prisma.eventAttendance.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, checkedInAt: checkedIn ? new Date() : null },
    update: { checkedInAt: checkedIn ? new Date() : null },
  })
}

/** True if the user hosts this event (gate for the attendance panel). */
export async function isEventHost(eventId: string, userId: string): Promise<boolean> {
  const e = await prisma.event.findUnique({ where: { id: eventId }, select: { hostId: true } })
  return !!e && e.hostId === userId
}

// ── Feedback (attendee-facing, post-event) ──

/** Valid feedback rating: integer 1–5. */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
}

export interface FeedbackSummary {
  count: number
  average: number | null
  recent: { rating: number; comment: string | null; name: string; at: string }[]
}

/** Whether a user is eligible to leave feedback: had a "going" RSVP. */
export async function canLeaveFeedback(eventId: string, userId: string): Promise<boolean> {
  const rsvp = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true },
  })
  return rsvp?.status === "going"
}

export async function getMyFeedback(eventId: string, userId: string): Promise<{ rating: number; comment: string | null } | null> {
  return prisma.eventFeedback.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { rating: true, comment: true },
  })
}

export async function submitFeedback(eventId: string, userId: string, rating: number, comment: string | null) {
  const c = comment?.trim() || null
  return prisma.eventFeedback.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, rating, comment: c },
    update: { rating, comment: c },
  })
}

export async function getFeedbackSummary(eventId: string): Promise<FeedbackSummary> {
  const [agg, recent] = await Promise.all([
    prisma.eventFeedback.aggregate({ where: { eventId }, _avg: { rating: true }, _count: true }),
    prisma.eventFeedback.findMany({
      where: { eventId, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { rating: true, comment: true, createdAt: true, user: { select: { legalName: true, displayName: true } } },
    }),
  ])
  return {
    count: agg._count,
    average: agg._avg.rating,
    recent: recent.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      name: r.user.displayName || r.user.legalName,
      at: r.createdAt.toISOString(),
    })),
  }
}

/** Fetch a single event by id, with the current user's RSVP status. */
export async function getEventById(id: string, userId: string | null) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, legalName: true, displayName: true, username: true } },
      rsvps: userId
        ? { where: { userId }, select: { status: true } }
        : false,
      _count: { select: { rsvps: true } },
    },
  })
  if (!event) return null

  const myRsvps = (event as { rsvps?: { status: string }[] }).rsvps ?? []
  const myStatus = myRsvps[0]?.status ?? null
  const interested = myStatus === "going" || myStatus === "maybe"

  return { event, interested, myStatus }
}
