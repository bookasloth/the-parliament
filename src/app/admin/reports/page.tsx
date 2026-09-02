import { requirePermission } from "@/lib/gate"
import { prisma } from "@/lib/prisma"
import { listReportClusters, getEntityPreview, type EntityPreview } from "@/modules/moderation/service"
import ReportsClient, { type ReportRow } from "./reports-client"

export const dynamic = "force-dynamic"

export default async function AdminReportsPage() {
  const admin = await requirePermission("reports:read")
  const clusters = await listReportClusters()

  const assigneeIds = [...new Set(clusters.map((c) => c.assigneeId).filter((x): x is string => !!x))]
  const assignees = assigneeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, displayName: true, legalName: true, username: true },
      })
    : []
  const nameById = new Map(assignees.map((a) => [a.id, a.displayName || a.legalName || a.username || a.id]))

  // Preview the reported content so moderators see WHAT was reported (P1-13).
  const previews = await Promise.all(clusters.map((c) => getEntityPreview(c.entityType, c.entityId).catch(() => null)))
  const previewByKey = new Map<string, EntityPreview>()
  previews.forEach((p, i) => { if (p) previewByKey.set(`${clusters[i].entityType}:${clusters[i].entityId}`, p) })

  const rows: ReportRow[] = clusters.map((c) => ({
    entityType: c.entityType,
    entityId: c.entityId,
    reportCount: c.reportCount,
    reasons: c.reasons,
    reporters: c.reporters,
    firstAt: c.firstAt,
    lastAt: c.lastAt,
    assignee: c.assigneeId ? nameById.get(c.assigneeId) ?? null : null,
    assignedToMe: c.assigneeId === admin.id,
    preview: previewByKey.get(`${c.entityType}:${c.entityId}`) ?? null,
  }))

  const stats = {
    openClusters: clusters.length,
    totalReports: clusters.reduce((sum, c) => sum + c.reportCount, 0),
    unassigned: clusters.filter((c) => !c.assigneeId).length,
    assignedToMe: clusters.filter((c) => c.assigneeId === admin.id).length,
  }

  return <ReportsClient clusters={rows} stats={stats} />
}
