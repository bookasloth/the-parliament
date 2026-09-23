import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { verifyPaymentSignature, getRazorpay } from "@/lib/razorpay"
import { checkCapturedPayment } from "@/modules/membership/payment-guard"
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

    const order = await prisma.idCardOrder.findUnique({ where: { id: body.orderId } })
    if (!order || order.userId !== user.id) return badRequest("Order not found")
    if (order.razorpayOrderId !== body.razorpayOrderId) return badRequest("Order mismatch")

    const valid = verifyPaymentSignature({
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    })
    if (!valid) return badRequest("Invalid signature")

    // Signature proves authenticity, not settlement — confirm capture for the
    // right amount against the right order before marking the order paid.
    const payment = await getRazorpay().payments.fetch(body.razorpayPaymentId)
    const check = checkCapturedPayment(
      payment as unknown as { status: string; amount: number | string; order_id?: string | null },
      order,
    )
    if (!check.ok) return badRequest(check.reason)

    // Idempotent claim — only the first verify (racing a double-submit or the
    // payment.captured webhook) flips created/attempted → paid.
    const claimed = await prisma.idCardOrder.updateMany({
      where: { id: order.id, status: { in: ["created", "attempted"] } },
      data: {
        status: "paid",
        razorpayPaymentId: body.razorpayPaymentId,
        razorpaySignature: body.razorpaySignature,
        capturedAt: new Date(),
      },
    })

    if (claimed.count === 0) return ok({ alreadyPaid: true })

    await audit({
      actorId: user.id,
      action: "idcard.verify",
      entityType: "id_card_order",
      entityId: order.id,
      payload: { amountPaise: order.amountPaise, qty: order.qty },
    })

    return ok({ orderId: order.id, status: "paid" })
  } catch (e) {
    return handleError(e)
  }
}
