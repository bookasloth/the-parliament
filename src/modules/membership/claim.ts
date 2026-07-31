import { prisma } from "@/lib/prisma"
import { activateMembership } from "./activation"
import { issueInvoiceAndSendReceipt } from "./invoice"
import { type PlanCode } from "@/config/membership"

export interface ClaimResult {
  claimed: boolean
  membershipId?: string
  endsAt?: Date | null
  newPlanCode?: PlanCode
}

/**
 * Atomically claim a membership order and activate it exactly once.
 *
 * The client-side POST /api/membership/verify call and the Razorpay
 * `payment.captured` webhook fire together on a successful payment, and a user
 * can double-submit /verify. Guarding with a plain `status` read + later write
 * is racy: both callers pass a stale `status !== "paid"` check and each runs
 * activateMembership, creating two active memberships for one payment.
 *
 * The updateMany with `status: { not: "paid" }` is a single atomic write, so
 * exactly one concurrent caller gets `count === 1` and runs activation; every
 * other caller gets `{ claimed: false }` and must no-op.
 *
 * ponytail: claim-then-activate. If activateMembership throws after the claim,
 * the order is "paid" with no membership — rare (activation is a self-contained
 * transaction) and admin-recoverable. A @@unique on Membership.orderId is the
 * hard DB backstop if it ever needs one.
 */
export async function claimAndActivateOrder(
  orderId: string,
  opts: { razorpayPaymentId: string; razorpaySignature?: string },
): Promise<ClaimResult> {
  const order = await prisma.membershipOrder.findUnique({ where: { id: orderId } })
  if (!order) return { claimed: false }

  const claimed = await prisma.membershipOrder.updateMany({
    where: { id: orderId, status: { not: "paid" } },
    data: {
      status: "paid",
      razorpayPaymentId: opts.razorpayPaymentId,
      razorpaySignature: opts.razorpaySignature,
      capturedAt: new Date(),
    },
  })
  if (claimed.count === 0) return { claimed: false }

  // Tier granted follows the server's order record (which set the charged
  // amount), never a client-echoed value — keeps tier and amount coupled.
  const activation = await activateMembership({
    userId: order.userId,
    planCode: order.planCode as PlanCode,
    source: "purchase",
    amountPaise: order.amountPaise,
    orderId: order.id,
  })

  // Order is now "paid" — issue the invoice + receipt (best-effort).
  await issueInvoiceAndSendReceipt(order.id)

  return {
    claimed: true,
    membershipId: activation.membershipId,
    endsAt: activation.endsAt,
    newPlanCode: activation.newPlanCode,
  }
}
