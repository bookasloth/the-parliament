import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { verifyPaymentSignature, getRazorpay } from "@/lib/razorpay"
import { checkCapturedPayment } from "@/modules/membership/payment-guard"
import { claimEventOrder } from "@/modules/events/orders"
import { audit } from "@/lib/audit"

const schema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: eventId } = await ctx.params
    const body = schema.parse(await req.json())

    const order = await prisma.eventOrder.findUnique({ where: { id: body.orderId } })
    if (!order || order.userId !== user.id || order.eventId !== eventId) return badRequest("Order not found")
    if (order.razorpayOrderId !== body.razorpayOrderId) return badRequest("Order mismatch")

    const valid = verifyPaymentSignature({
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    })
    if (!valid) return badRequest("Invalid signature")

    // Signature proves authenticity, not settlement — confirm capture + amount.
    const payment = await getRazorpay().payments.fetch(body.razorpayPaymentId)
    const check = checkCapturedPayment(
      payment as unknown as { status: string; amount: number | string; order_id?: string | null },
      order,
    )
    if (!check.ok) return badRequest(check.reason)

    const result = await claimEventOrder(order.id, {
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    })
    if (!result.claimed) return ok({ alreadyRegistered: true })

    await audit({
      actorId: user.id, action: "event.verify", entityType: "event_order", entityId: order.id,
      payload: { eventId },
    })

    return ok({ registered: true })
  } catch (e) {
    return handleError(e)
  }
}
