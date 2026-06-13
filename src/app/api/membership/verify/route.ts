import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { verifyPaymentSignature } from "@/lib/razorpay"
import { activateMembership } from "@/modules/membership/activation"
import { audit } from "@/lib/audit"
import { type PlanCode } from "@/config/membership"

const schema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = schema.parse(await req.json())

    const order = await prisma.membershipOrder.findUnique({
      where: { id: body.orderId },
    })
    if (!order || order.userId !== user.id) return badRequest("Order not found")
    if (order.razorpayOrderId !== body.razorpayOrderId) {
      return badRequest("Order mismatch")
    }

    const valid = verifyPaymentSignature({
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    })
    if (!valid) return badRequest("Invalid signature")

    if (order.status === "paid") {
      return ok({ alreadyActivated: true })
    }

    const activation = await activateMembership({
      userId: user.id,
      planCode: order.planCode as PlanCode,
      source: "purchase",
      amountPaise: order.amountPaise,
      orderId: order.id,
    })

    await prisma.membershipOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        razorpayPaymentId: body.razorpayPaymentId,
        razorpaySignature: body.razorpaySignature,
        capturedAt: new Date(),
      },
    })

    await audit({
      actorId: user.id,
      action: "membership.verify",
      entityType: "membership_order",
      entityId: order.id,
      payload: { membershipId: activation.membershipId },
    })

    return ok({
      membershipId: activation.membershipId,
      planCode: activation.newPlanCode,
      endsAt: activation.endsAt,
    })
  } catch (e) {
    return handleError(e)
  }
}
