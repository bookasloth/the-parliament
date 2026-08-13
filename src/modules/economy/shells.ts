import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"

import { STREAK_RESTORE_COST as _STREAK_RESTORE_COST } from "@/config/shells"

export { SHELL_PACKS, STREAK_RESTORE_COST, shellsForMembership, maxShellSpend } from "@/config/shells"
export type { ShellPackId } from "@/config/shells"

/** Credit shells to a user. */
export async function creditShells(
  userId: string,
  amount: number,
  reason: string,
  refId?: string,
): Promise<number> {
  if (amount <= 0) throw new Error("credit amount must be positive")
  const [, user] = await prisma.$transaction([
    prisma.shellLedger.create({ data: { userId, delta: amount, reason, refId } }),
    prisma.user.update({ where: { id: userId }, data: { shellBalance: { increment: amount } } }),
  ])
  return user.shellBalance
}

/** Spend shells. Throws if insufficient. */
export async function spendShells(
  userId: string,
  amount: number,
  reason: string,
  refId?: string,
): Promise<number> {
  if (amount <= 0) throw new Error("spend amount must be positive")
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { shellBalance: true } })
  if (!user) throw new ForbiddenError("User not found")
  if (user.shellBalance < amount) throw new ForbiddenError("Insufficient shells")

  const [, updated] = await prisma.$transaction([
    prisma.shellLedger.create({ data: { userId, delta: -amount, reason, refId } }),
    prisma.user.update({ where: { id: userId }, data: { shellBalance: { decrement: amount } } }),
  ])
  return updated.shellBalance
}

/** Spend shells to restore an Alfazy streak. */
export async function restoreStreak(userId: string): Promise<number> {
  return spendShells(userId, _STREAK_RESTORE_COST, "streak_restore")
}
