import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export interface AuditEntry {
  actorId?: string
  action: string
  entityType?: string
  entityId?: string
  payload?: Record<string, unknown>
  ipInet?: string
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        payload: (entry.payload ?? {}) as Prisma.InputJsonValue,
        ipInet: entry.ipInet,
      },
    })
  } catch (e) {
    console.error("Audit log failed:", e)
  }
}
