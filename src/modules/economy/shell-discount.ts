import { prisma } from "@/lib/prisma"
import { maxShellSpend, spendShells } from "./shells"

export interface ShellDiscountResult {
  shellsUsed: number
  discountPaise: number
  finalPaise: number
}

/**
 * Compute and apply a shell discount at checkout.
 * Call AFTER creating the DB order row, BEFORE creating the Razorpay order.
 *
 * @param userId      Who's paying
 * @param totalPaise  Original price in paise
 * @param shellsRequested  How many shells the user wants to use (from the form)
 * @param reason      Ledger reason (e.g. "event_discount", "membership_discount")
 * @param refId       Order ID for idempotency
 * @returns           Shells actually used, discount in paise, final Razorpay amount
 */
export async function applyShellDiscount(
  userId: string,
  totalPaise: number,
  shellsRequested: number,
  reason: string,
  refId: string,
): Promise<ShellDiscountResult> {
  if (shellsRequested <= 0) return { shellsUsed: 0, discountPaise: 0, finalPaise: totalPaise }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { shellBalance: true } })
  if (!user) return { shellsUsed: 0, discountPaise: 0, finalPaise: totalPaise }

  // Cap at 10% of balance
  const maxAllowed = maxShellSpend(user.shellBalance)
  // Cap at total price in rupees (1 shell = ₹1)
  const maxByPrice = Math.floor(totalPaise / 100)
  const shellsUsed = Math.min(shellsRequested, maxAllowed, maxByPrice, user.shellBalance)

  if (shellsUsed <= 0) return { shellsUsed: 0, discountPaise: 0, finalPaise: totalPaise }

  const discountPaise = shellsUsed * 100
  const finalPaise = totalPaise - discountPaise

  await spendShells(userId, shellsUsed, reason, refId)

  return { shellsUsed, discountPaise, finalPaise }
}
