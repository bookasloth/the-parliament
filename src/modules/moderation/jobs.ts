import { prisma } from "@/lib/prisma"
import { invalidateSession } from "@/lib/redis"
import { audit } from "@/lib/audit"
import { isSuspensionActive } from "@/modules/admin/users"

/**
 * Pure: should a user be flipped back to `active`? Only when they are currently
 * `suspended` AND no in-force suspension remains after the expiry sweep. A user
 * with a second, still-running (or indefinite) suspension stays suspended.
 */
export function shouldReactivate(currentStatus: string, remainingInForce: number): boolean {
  return currentStatus === "suspended" && remainingInForce === 0
}

/**
 * Lift every suspension whose `expiresAt` has passed and reactivate any user left
 * with no in-force suspension. Idempotent — safe to run on any schedule. Runs
 * from `/api/cron/moderation`. Without this a "7-day suspension" is permanent
 * because nothing reads `expiresAt` (audit finding P0-2).
 */
export async function expireDueSuspensions(now = new Date()): Promise<{
  liftedRows: number
  reactivated: number
}> {
  const due = await prisma.memberSuspension.findMany({
    where: { liftedAt: null, expiresAt: { not: null, lte: now } },
    select: { id: true, userId: true },
  })
  if (due.length === 0) return { liftedRows: 0, reactivated: 0 }

  await prisma.memberSuspension.updateMany({
    where: { id: { in: due.map((r) => r.id) } },
    data: { liftedAt: now },
  })

  let reactivated = 0
  const userIds = [...new Set(due.map((r) => r.userId))]
  for (const userId of userIds) {
    const [user, remaining] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { status: true } }),
      prisma.memberSuspension.findMany({
        where: { userId, liftedAt: null },
        select: { expiresAt: true, liftedAt: true },
      }),
    ])
    if (!user) continue
    const inForce = remaining.filter((s) => isSuspensionActive(s, now)).length
    if (!shouldReactivate(user.status, inForce)) continue

    // ponytail: no ModerationAction row here — its moderatorId is a required
    // Uuid and there's no real moderator for an auto-expiry. AuditLog (below)
    // captures the system event without misattributing it to a person.
    await prisma.user.update({ where: { id: userId }, data: { status: "active" } })
    await invalidateSession(userId)
    await audit({ actorId: userId, action: "moderation.suspension.expired", entityType: "user", entityId: userId })
    reactivated++
  }

  return { liftedRows: due.length, reactivated }
}
