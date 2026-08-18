import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export interface AuditEntry {
  actorId?: string
  action: string
  entityType?: string
  entityId?: string
  payload?: Record<string, unknown>
  ipInet?: string
  /** Request User-Agent, if available. Stored inside payload._ua. */
  userAgent?: string
  /** State before the mutation — stored inside payload._before for a diff. */
  before?: Record<string, unknown>
  /** State after the mutation — stored inside payload._after for a diff. */
  after?: Record<string, unknown>
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    // `AuditLog` has no dedicated user_agent / before / after columns, so fold
    // them into the JSONB payload under reserved `_`-prefixed keys. Move to real
    // columns later if the diff needs to be queried/indexed (ponytail: payload
    // is enough until then).
    const payload: Record<string, unknown> = { ...(entry.payload ?? {}) }
    if (entry.userAgent) payload._ua = entry.userAgent
    if (entry.before !== undefined) payload._before = entry.before
    if (entry.after !== undefined) payload._after = entry.after

    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        payload: payload as Prisma.InputJsonValue,
        ipInet: entry.ipInet,
      },
    })
  } catch (e) {
    console.error("Audit log failed:", e)
  }
}
