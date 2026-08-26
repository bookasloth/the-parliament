import { NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { PURCHASABLE_PLANS, computePricing, isDeltaUpgrade, lookupPromo, isPromoRedeemable, type PlanCode } from "@/config/membership"
import { getCurrent } from "@/modules/membership/service"
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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, legalName: true },
    })
    if (!dbUser) return badRequest("User not found")

    // Resolve the CURRENT tier from row truth (never the drift-prone
    // membershipStatus string) so an upgrade is priced against what the member
    // actually holds. A healthy active Associate upgrading to Premium pays only
    // the delta and keeps their existing renewal date; a lapsed/grace member
    // pays the full price for a fresh term.
    const current = await getCurrent(user.id)
    const eligibleForDelta =
      isDeltaUpgrade(current.planCode, planCode) &&
      !current.inGrace &&
      !!current.endsAt &&
      current.endsAt > new Date()
    const upgradeFromPlan: PlanCode | null = eligibleForDelta ? current.planCode : null
    const preserveEndsAt = eligibleForDelta ? current.endsAt : null
    const prevPlan = current.planCode

    // Validate the promo server-side: expired or over its total-redemption cap →
    // ignore it (charge full). Redemption count = paid orders that used the code.
    // This is the authoritative gate; the client's own expiry hint is advisory.
    const promo = lookupPromo(promoCode)
    let effectivePromoCode: string | undefined
    if (promo) {
      const redemptions = await prisma.membershipOrder.count({
        where: { status: "paid", metadata: { path: ["promoCode"], equals: promo.code } },
      })
      if (isPromoRedeemable(promo, { redemptions })) effectivePromoCode = promo.code
    }

    // Authoritative price — recomputed server-side; the client's total is never trusted.
    // Platform fee + optional donation + promo ride on a one-time order (Razorpay
    // subscriptions can't carry per-purchase add-ons), granting the plan's duration on verify.
    const pricing = computePricing(planCode, { platformFee, donate, promoCode: effectivePromoCode, upgradeFromPlan })
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
          isUpgradeDelta: pricing.isUpgradeDelta,
          upgradeFromPlan,
          preserveEndsAt: preserveEndsAt ? preserveEndsAt.toISOString() : null,
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
