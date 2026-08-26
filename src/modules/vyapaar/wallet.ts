import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { rateLimitOk } from "@/lib/rate-limit"
import { WELCOME_GRANT } from "@/config/vyapaar-coins"
import { planTopUp } from "./wallet-logic"

/** One-time welcome grant. Idempotent: the guarded updateMany credits exactly once. */
export async function ensureVyapaarEnrollment(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const granted = await tx.user.updateMany({
      where: { id: userId, vyapaarGranted: false },
      data: { vyapaarGranted: true, vyapaarWallet: { increment: WELCOME_GRANT } },
    })
    if (granted.count > 0) {
      await tx.vyapaarLedger.create({
        data: { userId, delta: WELCOME_GRANT, reason: "enrollment_grant" },
      })
    }
  })
}

/** Current coin balance (grants on first read). */
export async function getVyapaarWallet(userId: string): Promise<number> {
  await ensureVyapaarEnrollment(userId)
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { vyapaarWallet: true },
  })
  if (!u) throw new ForbiddenError("User not found")
  return u.vyapaarWallet
}

/** Pure balance read — does NOT grant. Callers that must grant use ensureVyapaarEnrollment first. */
export async function getVyapaarBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { vyapaarWallet: true } })
  return u?.vyapaarWallet ?? 0
}

/** Buy coins with shells. One-way, atomic, race-safe. */
export async function topUpVyapaarCoins(
  userId: string,
  packId: string,
): Promise<{ wallet: number; shells: number }> {
  if (!(await rateLimitOk({ bucket: "vyapaar:topup", identifier: userId, limit: 10, windowSec: 60 }))) {
    throw new ForbiddenError("Too many attempts — try again shortly")
  }
  const inGame = await prisma.vyapaarMatchPlayer.findFirst({ where: { userId, match: { status: "active" }, resultCash: null }, select: { matchId: true } })
  if (inGame) throw new ForbiddenError("You're in a game — finish it before buying coins")
  await ensureVyapaarEnrollment(userId)
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { shellBalance: true } })
    if (!u) throw new ForbiddenError("User not found")
    const plan = planTopUp(u.shellBalance, packId)
    if (!plan.ok) {
      throw new ForbiddenError(plan.error === "unknown_pack" ? "Unknown coin pack" : "Insufficient shells")
    }
    // Race-safe: only decrement if shells still suffice at write time.
    const moved = await tx.user.updateMany({
      where: { id: userId, shellBalance: { gte: plan.shellCost } },
      data: {
        shellBalance: { decrement: plan.shellCost },
        vyapaarWallet: { increment: plan.coinCredit },
      },
    })
    if (moved.count === 0) throw new ForbiddenError("Insufficient shells")
    await tx.shellLedger.create({
      data: { userId, delta: -plan.shellCost, reason: "vyapaar_topup", refId: plan.packId },
    })
    await tx.vyapaarLedger.create({
      data: { userId, delta: plan.coinCredit, reason: "shell_topup", refId: plan.packId },
    })
    const after = await tx.user.findUnique({
      where: { id: userId },
      select: { shellBalance: true, vyapaarWallet: true },
    })
    return { wallet: after!.vyapaarWallet, shells: after!.shellBalance }
  })
}
