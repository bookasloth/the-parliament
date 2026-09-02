"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requirePermission } from "@/lib/gate"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import { assignCluster, resolveCluster, restoreContent, logModerationAction } from "@/modules/moderation/service"
import { audit } from "@/lib/audit"

const entityType = z.enum(["post", "comment", "profile", "business", "message"])
const resolution = z.enum(["dismissed", "warned", "hidden", "removed"])

export async function assignClusterAction(et: string, entityId: string, claim: boolean) {
  const admin = await requirePermission("reports:read")
  const t = entityType.parse(et)
  const id = z.string().uuid().parse(entityId)
  await assignCluster(t, id, claim ? admin.id : null)
  revalidatePath("/admin/reports")
  return { ok: true }
}

export async function resolveClusterAction(input: {
  entityType: string
  entityId: string
  resolution: string
  notes?: string
}) {
  const admin = await requirePermission("reports:resolve")
  await enforceAdminRateLimit(admin.id, "report-resolve", 60, 60)
  const t = entityType.parse(input.entityType)
  const id = z.string().uuid().parse(input.entityId)
  const res = resolution.parse(input.resolution)
  const notes = z.string().trim().min(3).max(1000).parse(input.notes ?? "")
  const r = await resolveCluster({ entityType: t, entityId: id, reviewerId: admin.id, resolution: res, notes })
  revalidatePath("/admin/reports")
  return r
}

/** Reverse a hide/remove (audit P0-6). Gated on content:moderate; logged. */
export async function restoreContentAction(input: { entityType: string; entityId: string }) {
  const admin = await requirePermission("content:moderate")
  const t = entityType.parse(input.entityType)
  const id = z.string().uuid().parse(input.entityId)
  await restoreContent(t, id)
  await logModerationAction({ moderatorId: admin.id, targetType: t, targetId: id, action: "restore" })
  await audit({ actorId: admin.id, action: "moderation.restore", entityType: t, entityId: id })
  revalidatePath("/admin/reports")
  return { ok: true as const }
}
