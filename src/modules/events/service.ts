import { prisma } from "@/lib/prisma"

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
 * List published events for a school, mapped to the EventItem shape the
 * client UI expects. `userId` is used to resolve the per-user `interested`
 * flag (going/interested RSVP).
 */
export async function listEvents(
  schoolId: string,
  userId: string | null,
): Promise<EventItem[]> {
  const events = await prisma.event.findMany({
    where: { schoolId, status: "published" },
    orderBy: { startsAt: "asc" },
    include: {
      rsvps: userId
        ? { where: { userId }, select: { status: true } }
        : false,
    },
  })

  const now = new Date()

  return events.map((e) => {
    const myRsvps = (e as { rsvps?: { status: string }[] }).rsvps ?? []
    const interested = myRsvps.some(
      (r) => r.status === "going" || r.status === "interested",
    )
    return {
      id: e.id,
      slug: e.id,
      title: e.title,
      date: formatDate(e.startsAt),
      time: formatTime(e.startsAt),
      mode: mapMode(e.mode),
      cover: e.bannerUrl ?? "",
      isFree: true,
      price: undefined,
      interested,
      category: e.mode || "General",
      isPast: e.startsAt < now,
    }
  })
}

/** Upsert an RSVP for the given user/event. */
export async function rsvpEvent(
  userId: string,
  eventId: string,
  status: string = "going",
) {
  return prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, status },
    update: { status },
  })
}

/** Remove a user's RSVP for an event. */
export async function cancelRsvp(userId: string, eventId: string) {
  return prisma.eventRsvp.deleteMany({ where: { eventId, userId } })
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
  const interested = myRsvps.some(
    (r) => r.status === "going" || r.status === "interested",
  )

  return { event, interested }
}
