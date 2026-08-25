import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { sendNotification } from "@/modules/notifications/service"

const DAILY_THROW_CAP = 10
const REPEAT_TARGET_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24h rolling window per target, from the last throw
const MIN_ACCOUNT_AGE_DAYS = 7
const SIGNUP_EGGS = 20

/** Throw an egg: thrower −1, target +1. */
export async function throwEgg(throwerId: string, targetId: string): Promise<void> {
  if (throwerId === targetId) throw new ForbiddenError("Can't egg yourself")

  const [thrower, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: throwerId }, select: { eggBalance: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { id: true, createdAt: true, deletedAt: true } }),
  ])
  if (!thrower) throw new ForbiddenError("User not found")
  if (!target || target.deletedAt) throw new ForbiddenError("Target not found")
  if (thrower.eggBalance < 1) throw new ForbiddenError("No eggs to throw")

  // Sybil guard: target must be ≥7 days old
  const ageDays = (Date.now() - target.createdAt.getTime()) / 86_400_000
  if (ageDays < MIN_ACCOUNT_AGE_DAYS) throw new ForbiddenError("Target account too new")

  // Daily throw cap
  const dayStart = startOfIstDay()
  const throwsToday = await prisma.eggThrow.count({
    where: { throwerId, createdAt: { gte: dayStart } },
  })
  if (throwsToday >= DAILY_THROW_CAP) throw new ForbiddenError("Daily throw limit reached")

  // Repeat-target cooldown
  const cooldownSince = new Date(Date.now() - REPEAT_TARGET_COOLDOWN_MS)
  const recentToTarget = await prisma.eggThrow.findFirst({
    where: { throwerId, targetId, createdAt: { gte: cooldownSince } },
    select: { id: true },
  })
  if (recentToTarget) throw new ForbiddenError("Wait before egging this person again")

  // Atomic transfer + log
  const [throwerRow] = await prisma.$transaction([
    prisma.user.update({ where: { id: throwerId }, data: { eggBalance: { decrement: 1 } }, select: { displayName: true, legalName: true } }),
    prisma.user.update({ where: { id: targetId }, data: { eggBalance: { increment: 1 } } }),
    prisma.eggThrow.create({ data: { throwerId, targetId } }),
  ])

  // Best-effort notification
  const name = throwerRow.displayName || throwerRow.legalName
  sendNotification({
    userId: targetId,
    kind: "egg_thrown",
    title: "🥚 You got egged!",
    body: `${name} threw an egg at you!`,
    entityType: "user",
    entityId: throwerId,
  }).catch(() => {})
}

/** Resolve the monthly egg game: return user(s) with the most eggs. */
export async function resolveMonthlyEggs(): Promise<{
  topHolders: { id: string; eggBalance: number }[]
}> {
  // Find max egg balance
  const top = await prisma.user.findFirst({
    where: { deletedAt: null, status: "active" },
    orderBy: { eggBalance: "desc" },
    select: { eggBalance: true },
  })
  if (!top || top.eggBalance <= SIGNUP_EGGS) return { topHolders: [] }

  // All tied at the max
  const topHolders = await prisma.user.findMany({
    where: { deletedAt: null, status: "active", eggBalance: top.eggBalance },
    select: { id: true, eggBalance: true },
  })

  return { topHolders }
}

/** Reset all users to 20 eggs. Run after resolveMonthlyEggs. */
export async function resetAllEggs(): Promise<number> {
  const result = await prisma.user.updateMany({
    where: { deletedAt: null },
    data: { eggBalance: SIGNUP_EGGS },
  })
  return result.count
}

/** Egg leaderboard: users with most eggs (the losers). */
export async function eggLeaderboard(limit = 10): Promise<{ id: string; username: string | null; displayName: string | null; legalName: string; eggBalance: number }[]> {
  return prisma.user.findMany({
    where: { deletedAt: null, status: "active" },
    orderBy: { eggBalance: "desc" },
    take: limit,
    select: { id: true, username: true, displayName: true, legalName: true, eggBalance: true },
  })
}

function startOfIstDay(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now)
  return new Date(`${ymd}T00:00:00+05:30`)
}

export const EGGS_CONFIG = { DAILY_THROW_CAP, REPEAT_TARGET_COOLDOWN_MS, MIN_ACCOUNT_AGE_DAYS, SIGNUP_EGGS } as const
