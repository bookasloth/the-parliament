import { Video } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/modules/auth/session"
import { callsEnabled } from "@/config/calls"
import { PageHeader, ComingSoon } from "../admin-ui"
import AmaAdmin from "./AmaAdmin"

export const dynamic = "force-dynamic"

export default async function AdminAmaPage() {
  await requireAdmin()

  if (!callsEnabled()) {
    return (
      <ComingSoon
        title="Video calling is off"
        description="AMA sessions unlock when video calling is enabled. Set FEATURE_VIDEO_CALLS=on to launch."
        icon={<Video className="h-7 w-7" />}
        planned={["1:1 huddles in DMs", "Admin-scheduled AMA rooms with a co-host", "Free audience access for all members"]}
      />
    )
  }

  const sessions = await prisma.amaSession.findMany({
    orderBy: { startsAt: "desc" },
    take: 50,
  })

  // Resolve host/co-host names in one round-trip (plain userId, no FK).
  const ids = [...new Set(sessions.flatMap((s) => [s.hostId, s.coHostId].filter(Boolean) as string[]))]
  const people = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, legalName: true } })
  const nameById = new Map(people.map((p) => [p.id, p.legalName]))

  const rows = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    startsAt: s.startsAt.toISOString(),
    host: nameById.get(s.hostId) ?? "—",
    coHost: s.coHostId ? nameById.get(s.coHostId) ?? "—" : null,
  }))

  return (
    <div>
      <PageHeader title="AMA Sessions" description="Schedule and run live Ask-Me-Anything rooms. Only admins can schedule; anyone can attend." />
      <AmaAdmin rows={rows} />
    </div>
  )
}
