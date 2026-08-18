import { requireAdmin } from "@/modules/auth/session"
import { listAnnouncements } from "@/modules/announcements/service"
import AnnouncementsClient, { type AnnouncementRow } from "./notifications-client"

export const dynamic = "force-dynamic"

function statusOf(startsAt: Date, endsAt: Date, now: Date): AnnouncementRow["status"] {
  if (now < startsAt) return "scheduled"
  if (now >= endsAt) return "expired"
  return "active"
}

const fmt = (d: Date) =>
  d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  const now = new Date()
  const rows = await listAnnouncements(100)

  const announcements: AnnouncementRow[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    ctaLabel: a.ctaLabel,
    ctaHref: a.ctaHref,
    startsAtISO: a.startsAt.toISOString(),
    endsAtISO: a.endsAt.toISOString(),
    starts: fmt(a.startsAt),
    ends: fmt(a.endsAt),
    status: statusOf(a.startsAt, a.endsAt, now),
  }))

  const stats = {
    active: announcements.filter((a) => a.status === "active").length,
    scheduled: announcements.filter((a) => a.status === "scheduled").length,
    expired: announcements.filter((a) => a.status === "expired").length,
  }

  return <AnnouncementsClient announcements={announcements} stats={stats} />
}
