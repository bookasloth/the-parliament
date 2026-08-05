import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { parsePage, pageCount, firstParam, PAGE_SIZE } from "@/modules/admin/pagination"
import AuditLogsClient, { type AuditRow } from "./audit-logs-client"

export const dynamic = "force-dynamic"

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams
  const { page, skip, take } = parsePage(sp.page)
  const q = firstParam(sp.q)
  const action = firstParam(sp.action)

  // Free-text search hits the plain text columns only (actor names + JSON
  // payload aren't indexable here — use the action filter for those).
  const where: Prisma.AuditLogWhereInput = {}
  if (action) where.action = action
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { ipInet: { contains: q, mode: "insensitive" } },
    ]
  }

  const [logs, filteredTotal, actionGroups] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], orderBy: { action: "asc" } }),
  ])

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

  return (
    <AuditLogsClient
      rows={rows}
      actions={actionGroups.map((g) => g.action)}
      query={{ page, q: q ?? "", action: action ?? "" }}
      pageInfo={{ page, pageCount: pageCount(filteredTotal), filteredTotal, pageSize: PAGE_SIZE }}
    />
  )
}
