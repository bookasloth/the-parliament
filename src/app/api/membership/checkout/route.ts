import { NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { PLANS, PURCHASABLE_PLANS, type PlanCode } from "@/config/membership"
import { buildReceipt, getRazorpay, publicKeyId } from "@/lib/razorpay"
import { audit } from "@/lib/audit"

const schema = z.object({
  planCode: z.enum(PURCHASABLE_PLANS as [PlanCode, ...PlanCode[]]),
  refundPolicyAcknowledged: z.literal(true, {
    message: "You must acknowledge the non-refundable policy",
  }),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { planCode, refundPolicyAcknowledged } = schema.parse(await req.json())

    if (!refundPolicyAcknowledged) {
      return badRequest("Non-refundable acknowledgement required")
    }

    const def = PLANS[planCode]
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
        amountPaise: def.pricePaise,
        currency: "INR",
        status: "created",
        metadata: {
          refundPolicyAcknowledgedAt: new Date().toISOString(),
          prevPlan,
        } as Prisma.InputJsonValue,
      },
    })

    if (def.isSubscription) {
      if (!def.razorpayPlanId) throw new Error(`Plan ${planCode} missing razorpayPlanId`)
      const sub = await rzp.subscriptions.create({
        plan_id: def.razorpayPlanId,
        total_count: 60,
        customer_notify: 1,
        notes: { userId: user.id, planCode, prevPlan, orderId: order.id },
      })

      await prisma.membershipOrder.update({
        where: { id: order.id },
        data: { razorpaySubscriptionId: sub.id, status: "attempted" },
      })

      await audit({
        actorId: user.id,
        action: "membership.checkout.subscription",
        entityType: "membership_order",
        entityId: order.id,
        payload: { planCode, subscriptionId: sub.id },
      })

      return ok({
        kind: "subscription",
        orderId: order.id,
        subscriptionId: sub.id,
        amountPaise: def.pricePaise,
        currency: "INR",
        keyId: publicKeyId(),
        customer: { name: dbUser.legalName, email: dbUser.email },
      })
    }

    const rzpOrder = await rzp.orders.create({
      amount: def.pricePaise,
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
      payload: { planCode, razorpayOrderId: rzpOrder.id },
    })

    return ok({
      kind: "order",
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amountPaise: def.pricePaise,
      currency: "INR",
      keyId: publicKeyId(),
      customer: { name: dbUser.legalName, email: dbUser.email },
    })
  } catch (e) {
    return handleError(e)
  }
}
