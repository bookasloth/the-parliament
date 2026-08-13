import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"

/** Shell store packs: price in paise, shells granted. */
export const SHELL_PACKS = [
  { id: "pack_100", priceInr: 100, pricePaise: 10000, shells: 100, bonus: 0 },
  { id: "pack_250", priceInr: 250, pricePaise: 25000, shells: 265, bonus: 15 },
  { id: "pack_500", priceInr: 500, pricePaise: 50000, shells: 550, bonus: 50 },
  { id: "pack_1000", priceInr: 1000, pricePaise: 100000, shells: 1150, bonus: 150 },
  { id: "pack_2000", priceInr: 2000, pricePaise: 200000, shells: 2400, bonus: 400 },
] as const

export type ShellPackId = (typeof SHELL_PACKS)[number]["id"]

/** Shells granted for a membership purchase: price ÷ 100, rounded down. */
export function shellsForMembership(priceInr: number): number {
  return Math.floor(priceInr / 100)
}

/** Max shells spendable at checkout = 10% of balance, rounded down. */
export function maxShellSpend(balance: number): number {
  return Math.floor(balance / 10)
}

export const STREAK_RESTORE_COST = 2

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
  return spendShells(userId, STREAK_RESTORE_COST, "streak_restore")
}
