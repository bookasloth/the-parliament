"use server"

import { revalidatePath, updateTag } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit } from "@/lib/rate-limit"
import {
  cancelRsvp, getEventById, rsvpEvent, type EventItem,
  isEventHost, setCheckIn, canLeaveFeedback, submitFeedback, isValidRating,
} from "@/modules/events/service"
import { createEventSchema, rupeesToPaise, type CreateEventInput } from "./create-schema"

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
  const { title, date, time, mode, venue, eventUrl, priceRupees } = parsed.data

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
      priceInPaise: rupeesToPaise(priceRupees),
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
  await enforceRateLimit({ bucket: "event.rsvp", identifier: user.id, limit: 40, windowSec: 3600 })

  const existing = await getEventById(eventId, user.id)
  if (existing?.interested) {
    await cancelRsvp(user.id, eventId)
  } else {
    await rsvpEvent(user.id, eventId, "going")
  }

  revalidatePath("/events")
  return { interested: !existing?.interested }
}

/** Register for a FREE event (going). Paid events go through Razorpay instead. */
export async function registerFreeAction(eventId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { priceInPaise: true, status: true } })
  if (!event || event.status === "cancelled") return { ok: false, error: "Event not available" }
  if (event.priceInPaise > 0) return { ok: false, error: "This event requires payment" }
  await rsvpEvent(user.id, eventId, "going")
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

/** Toggle the secondary "Interested" signal (maybe) — no payment, no registration. */
export async function toggleInterestAction(eventId: string): Promise<{ interested: boolean }> {
  const user = await requireUser()
  const existing = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
    select: { status: true },
  })
  if (existing?.status === "maybe") {
    await cancelRsvp(user.id, eventId)
    revalidatePath(`/events/${eventId}`)
    return { interested: false }
  }
  // Don't clobber a paid "going" registration with a downgrade to interested.
  if (existing?.status === "going") return { interested: false }
  await rsvpEvent(user.id, eventId, "maybe")
  revalidatePath(`/events/${eventId}`)
  return { interested: true }
}

/** Host-only: toggle an attendee's check-in for an event. */
export async function checkInAction(
  eventId: string,
  attendeeId: string,
  checkedIn: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  if (!(await isEventHost(eventId, user.id))) return { ok: false, error: "Only the host can check attendees in." }
  await setCheckIn(eventId, attendeeId, checkedIn)
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

/** Attendee feedback (rating 1–5 + optional comment) on a past event. */
export async function submitFeedbackAction(
  eventId: string,
  rating: number,
  comment: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  if (!isValidRating(rating)) return { ok: false, error: "Pick a rating from 1 to 5." }
  if (!(await canLeaveFeedback(eventId, user.id))) return { ok: false, error: "Only attendees can leave feedback." }
  await submitFeedback(eventId, user.id, rating, comment)
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
