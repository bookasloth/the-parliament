"use server"

import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional().nullable(),
  // ISO date string YYYY-MM-DD from <input type="date">.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // HH:MM 24h from <input type="time">.
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(15).max(60 * 24 * 7),
  location: z.string().max(240).optional().nullable(),
  isPaid: z.boolean(),
  mode: z.enum(["online", "offline"]),
  visibility: z.enum(["network", "public"]),
})

export type CreateEventInput = z.infer<typeof schema>

export async function createAdminEventAction(input: CreateEventInput) {
  const admin = await requireAdmin()
  const parsed = schema.parse(input)

  const schoolId = await getDefaultSchoolId()
  if (!schoolId) throw new Error("No default school configured")

  // Interpret date+time as server-local IST — matches how admins enter values.
  const startsAt = new Date(`${parsed.date}T${parsed.time}:00`)
  if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid date/time")
  const endsAt = new Date(startsAt.getTime() + parsed.durationMinutes * 60_000)

  const event = await prisma.event.create({
    data: {
      schoolId,
      hostId: admin.id,
      title: parsed.title,
      description: parsed.description ?? null,
      startsAt,
      endsAt,
      mode: parsed.mode === "online" ? "online" : "in-person",
      venue: parsed.mode === "offline" ? parsed.location ?? null : null,
      onlineUrl: parsed.mode === "online" ? parsed.location ?? null : null,
      visibility: parsed.visibility === "network" ? "school" : "public",
      status: "published",
    },
    select: { id: true },
  })

  // New published event enters the cached shared list (tag "events").
  updateTag("events")
  revalidatePath("/admin/events")
  revalidatePath("/events")
  return { id: event.id, isPaid: parsed.isPaid }
}

/**
 * Schedule the staggered "Invite All" waves for an event — Life/Committee now,
 * Premium +2h, Associate +4h, Student +6h. The cron sends them; this returns
 * immediately. Idempotent per event.
 */
export async function inviteAllToEventAction(
  eventId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true },
  })
  if (!event) return { ok: false, error: "Event not found" }
  if (event.status !== "published") return { ok: false, error: "Only published events can be announced" }
  try {
    const { scheduleEventInvites } = await import("@/modules/events/invites")
    await scheduleEventInvites(eventId)
    return { ok: true }
  } catch (e) {
    console.error(`invite scheduling failed for event ${eventId}`, e)
    return { ok: false, error: "Could not schedule invites" }
  }
}
