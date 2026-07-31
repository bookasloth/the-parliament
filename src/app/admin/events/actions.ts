"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/modules/notifications/service"

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

  await announceNewEvent(event.id, parsed.title)

  revalidatePath("/admin/events")
  revalidatePath("/events")
  return { id: event.id, isPaid: parsed.isPaid }
}

/**
 * Notify every registered alumnus (not current students of the school) of a new
 * event — in-app + email.
 *
 * ponytail: inline, capped fan-out. It runs in the create request, which is fine
 * at the current alumni scale. Move to a pg-boss job once the worker bootstrap
 * lands (registerMembershipJobs is currently unwired) or the base outgrows one
 * request. Each send is guarded so one bad recipient can't abort the rest.
 */
async function announceNewEvent(eventId: string, title: string) {
  const base = process.env.AUTH_URL || "https://nnawca.org"
  const eventUrl = `${base}/events/${eventId}`
  const recipients = await prisma.user.findMany({
    where: { status: "active", memberType: { not: "student" }, email: { not: "" } },
    select: { id: true },
    take: 5000,
  })
  for (const r of recipients) {
    await sendNotification({
      userId: r.id,
      kind: "new_event_in_batch",
      title: `New alumni event: ${title}`,
      entityType: "event",
      entityId: eventId,
      email: { eventTitle: title, eventUrl },
    }).catch((e) => console.error(`event announce failed for ${r.id}`, e))
  }
}
