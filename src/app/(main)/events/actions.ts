"use server"

import { revalidatePath, updateTag } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { prisma } from "@/lib/prisma"
import { cancelRsvp, getEventById, rsvpEvent, type EventItem } from "@/modules/events/service"
import { createEventSchema, type CreateEventInput } from "./create-schema"

/**
 * Member-created event. Uses only the columns the Event model already has
 * (title/date/time/mode/venue/onlineUrl); ponytail: Free/Paid + price is
 * deferred until the Event model gains a price column and events wire into
 * the Razorpay flow. Returns the new EventItem so the list updates instantly.
 */
export async function createEventAction(
  input: CreateEventInput,
): Promise<{ ok: true; event: EventItem } | { ok: false; error: string }> {
  const user = await requireUser()
  const parsed = createEventSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Please fill in the required fields." }
  const { title, date, time, mode, venue, eventUrl } = parsed.data

  const schoolId = await getDefaultSchoolId()
  if (!schoolId) return { ok: false, error: "No school configured." }

  const startsAt = new Date(`${date}T${time}:00`)
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Invalid date/time." }
  // Default 2h duration — Event.endsAt is optional but the detail view expects one.
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60_000)
  // Schema stores "online"; the UI union uses "virtual".
  const storedMode = mode === "virtual" ? "online" : mode
  const url = eventUrl && eventUrl.length > 0 ? eventUrl : null

  const event = await prisma.event.create({
    data: {
      schoolId,
      hostId: user.id,
      title,
      startsAt,
      endsAt,
      mode: storedMode,
      venue: mode !== "virtual" ? venue || null : null,
      onlineUrl: url, // registration / landing link — optional on any mode
      visibility: "school",
      status: "published",
    },
    select: { id: true, startsAt: true },
  })

  updateTag("events")
  revalidatePath("/events")
  return {
    ok: true,
    event: {
      id: event.id,
      slug: event.id,
      title,
      date: event.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: event.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      mode,
      cover: "",
      isFree: true,
      interested: false,
      category: storedMode,
      isPast: false,
    },
  }
}

/**
 * Toggle the current user's RSVP for an event: if already RSVP'd
 * (going/interested), cancel it; otherwise mark as going.
 */
export async function rsvpAction(eventId: string) {
  const user = await requireUser()

  const existing = await getEventById(eventId, user.id)
  if (existing?.interested) {
    await cancelRsvp(user.id, eventId)
  } else {
    await rsvpEvent(user.id, eventId, "going")
  }

  revalidatePath("/events")
  return { interested: !existing?.interested }
}
