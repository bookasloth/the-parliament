import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { verifyPaymentSignature, getRazorpay } from "@/lib/razorpay"
import { packPaymentValid, STUDENT_PASS } from "@/config/calls"

const schema = z.object({
  passId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

/** POST /api/calls/pack/verify — confirm payment and activate the student pass. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = schema.parse(await req.json())

    const pass = await prisma.callPass.findUnique({ where: { id: body.passId } })
    if (!pass || pass.userId !== user.id) return badRequest("Pass not found")
    if (pass.orderId !== body.razorpayOrderId) return badRequest("Order mismatch")
    if (pass.status === "active") return ok({ alreadyActivated: true })
    if (pass.status !== "pending") return badRequest("Pass is not payable")

    // Signature proves authenticity; the fetch proves capture + amount.
    const valid = verifyPaymentSignature({
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    })
    if (!valid) return badRequest("Invalid signature")

    const payment = await getRazorpay().payments.fetch(body.razorpayPaymentId)
    if (!packPaymentValid(payment as unknown as { status: string; amount: number | string })) {
      return badRequest("Payment not captured for the expected amount")
    }

    // Activate exactly once (races a double-submit); fresh TTL from activation.
    const now = new Date()
    const claimed = await prisma.callPass.updateMany({
      where: { id: pass.id, status: "pending" },
      data: {
        status: "active",
        paymentId: body.razorpayPaymentId,
        purchasedAt: now,
        expiresAt: new Date(now.getTime() + STUDENT_PASS.ttlDays * 86_400_000),
      },
    })
    if (claimed.count === 0) return ok({ alreadyActivated: true })

    return ok({ passId: pass.id, minutes: pass.minutes })
  } catch (e) {
    return handleError(e)
  }
}
