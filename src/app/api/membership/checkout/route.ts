import { NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { PURCHASABLE_PLANS, computePricing, type PlanCode } from "@/config/membership"
import { buildReceipt, getRazorpay, publicKeyId } from "@/lib/razorpay"
import { audit } from "@/lib/audit"

const schema = z.object({
  planCode: z.enum(PURCHASABLE_PLANS as [PlanCode, ...PlanCode[]]),
  refundPolicyAcknowledged: z.literal(true, {
    message: "You must acknowledge the non-refundable policy",
  }),
  platformFee: z.boolean().optional().default(false),
  donate: z.boolean().optional().default(false),
  promoCode: z.string().trim().max(40).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { planCode, refundPolicyAcknowledged, platformFee, donate, promoCode } = schema.parse(await req.json())

    if (!refundPolicyAcknowledged) {
      return badRequest("Non-refundable acknowledgement required")
    }

    // Authoritative price — recomputed server-side; the client's total is never trusted.
    // Platform fee + optional donation + promo ride on a one-time order (Razorpay
    // subscriptions can't carry per-purchase add-ons), granting the plan's duration on verify.
    const pricing = computePricing(planCode, { platformFee, donate, promoCode })

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, legalName: true, membershipStatus: true },
    })
    if (!dbUser) return badRequest("User not found")

    const prevPlan = dbUser.membershipStatus as PlanCode
    const rzp = getRazorpay()
    const receipt = buildReceipt(user.id)

    const order = await prisma.membershipOrder.create({
      data: {
        userId: user.id,
        planCode,
        amountPaise: pricing.totalPaise,
        currency: "INR",
        status: "created",
        metadata: {
          refundPolicyAcknowledgedAt: new Date().toISOString(),
          prevPlan,
          basePaise: pricing.basePaise,
          platformFeePaise: pricing.platformFeePaise,
          donationPaise: pricing.donationPaise,
          discountPaise: pricing.discountPaise,
          promoCode: pricing.promo?.code ?? null,
        } as Prisma.InputJsonValue,
      },
    })

    const rzpOrder = await rzp.orders.create({
      amount: pricing.totalPaise,
      currency: "INR",
      receipt,
      notes: { userId: user.id, planCode, prevPlan, orderId: order.id },
    })

    await prisma.membershipOrder.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id, status: "attempted" },
    })

    await audit({
      actorId: user.id,
      action: "membership.checkout.order",
      entityType: "membership_order",
      entityId: order.id,
      payload: { planCode, razorpayOrderId: rzpOrder.id, amountPaise: pricing.totalPaise, promoCode: pricing.promo?.code ?? null },
    })

    return ok({
      kind: "order",
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amountPaise: pricing.totalPaise,
      currency: "INR",
      keyId: publicKeyId(),
      customer: { name: dbUser.legalName, email: dbUser.email },
    })
  } catch (e) {
    return handleError(e)
  }
}
