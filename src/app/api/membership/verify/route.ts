import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { verifyPaymentSignature } from "@/lib/razorpay"
import { claimAndActivateOrder } from "@/modules/membership/claim"
import { audit } from "@/lib/audit"

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

    // Atomic claim + single activation (races the payment.captured webhook and
    // double-submits). See claimAndActivateOrder.
    const result = await claimAndActivateOrder(order.id, {
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    })
    if (!result.claimed) {
      return ok({ alreadyActivated: true })
    }

    await audit({
      actorId: user.id,
      action: "membership.verify",
      entityType: "membership_order",
      entityId: order.id,
      payload: { membershipId: result.membershipId },
    })

    return ok({
      membershipId: result.membershipId,
      planCode: result.newPlanCode,
      endsAt: result.endsAt,
    })
  } catch (e) {
    return handleError(e)
  }
}
