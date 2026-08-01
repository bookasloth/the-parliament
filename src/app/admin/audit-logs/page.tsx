import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import AuditLogsClient, { type AuditRow } from "./audit-logs-client"

export const dynamic = "force-dynamic"

export default async function AdminAuditLogsPage() {
  await requireAdmin()

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  // Plain actorId field (no FK relation) — app-layer join to names.
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x))]
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, legalName: true, displayName: true, username: true, email: true },
      })
    : []
  const nameById = new Map(actors.map((a) => [a.id, a.legalName || a.displayName || a.username || a.email]))

  const rows: AuditRow[] = logs.map((l) => ({
    id: String(l.id),
    actor: l.actorId ? nameById.get(l.actorId) ?? l.actorId : "system",
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    payload: JSON.stringify(l.payload ?? {}),
    ip: l.ipInet,
    at: l.createdAt.toISOString(),
  }))

  return <AuditLogsClient rows={rows} />
}
