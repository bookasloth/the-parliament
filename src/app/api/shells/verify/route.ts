import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { verifyPaymentSignature, getRazorpay } from "@/lib/razorpay"
import { SHELL_PACKS } from "@/modules/economy/shells"
import { creditShells } from "@/modules/economy/shells"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  packId: z.string(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

/** POST /api/shells/verify — confirm payment and credit shells. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = schema.parse(await req.json())

    const pack = SHELL_PACKS.find((p) => p.id === body.packId)
    if (!pack) return badRequest("Unknown pack")

    // Idempotency: already credited for this order?
    const existing = await prisma.shellLedger.findFirst({
      where: { userId: user.id, reason: "store_purchase", refId: body.razorpayOrderId },
      select: { id: true },
    })
    if (existing) return ok({ alreadyCredited: true, shells: pack.shells })

    const valid = verifyPaymentSignature({
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    })
    if (!valid) return badRequest("Invalid signature")

    const payment = await getRazorpay().payments.fetch(body.razorpayPaymentId)
    const p = payment as unknown as { status: string; amount: number | string }
    if (p.status !== "captured" || Number(p.amount) !== pack.pricePaise) {
      return badRequest("Payment not captured for the expected amount")
    }

    const newBalance = await creditShells(user.id, pack.shells, "store_purchase", body.razorpayOrderId)

    return ok({ shells: pack.shells, newBalance })
  } catch (e) {
    return handleError(e)
  }
}
