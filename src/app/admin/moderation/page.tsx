import { requireAdmin } from "@/modules/auth/session"
import { listOpenReports } from "@/modules/moderation/service"
import { prisma } from "@/lib/prisma"
import { relativeTime } from "@/lib/relative-time"
import ModerationClient, { type ModReport } from "./moderation-client"

export const dynamic = "force-dynamic"

export default async function AdminModerationPage() {
  await requireAdmin()

  const [open, resolved30d] = await Promise.all([
    listOpenReports(100),
    prisma.contentReport.count({
      where: {
        status: { in: ["dismissed", "warned", "hidden", "removed"] },
        resolvedAt: { gte: new Date(Date.now() - 30 * 86400_000) },
      },
    }),
  ])

  const reports: ModReport[] = open.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    reason: r.reason,
    details: r.details,
    reporter: r.reporter?.legalName || r.reporter?.displayName || r.reporter?.username || "unknown",
    time: relativeTime(r.createdAt),
  }))

  return <ModerationClient reports={reports} resolved30d={resolved30d} />
}
