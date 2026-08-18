import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { validateAnnouncement, type AnnouncementInput } from "./validate"

export { validateAnnouncement, type AnnouncementInput }

export async function createAnnouncement(input: AnnouncementInput, createdBy: string) {
  return prisma.announcement.create({ data: { ...input, createdBy } })
}

export async function listAnnouncements(limit = 100) {
  return prisma.announcement.findMany({ orderBy: { startsAt: "desc" }, take: limit })
}

export async function deleteAnnouncement(id: string) {
  const a = await prisma.announcement.findUnique({ where: { id }, select: { id: true } })
  if (!a) throw new ForbiddenError("Announcement not found")
  await prisma.announcement.delete({ where: { id } })
}

/** The single live announcement to show at the top of the feed, if any. */
export async function getActiveAnnouncement(now = new Date()) {
  return prisma.announcement.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { startsAt: "desc" },
    select: { id: true, title: true, body: true, ctaLabel: true, ctaHref: true, endsAt: true },
  })
}
