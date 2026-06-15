"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { cancelRsvp, getEventById, rsvpEvent } from "@/modules/events/service"

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
