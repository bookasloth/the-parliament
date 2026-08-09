import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { verifyPaymentSignature, getRazorpay } from "@/lib/razorpay"
import { sendCertificateEmail } from "@/modules/contributions/certificate-email"
import type { SponsorTier } from "@/config/sponsor"

const schema = z.object({
  contributionId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

/**
 * POST /api/contribute/verify — confirm a contribution payment and mark it paid.
 * Signature proves authenticity; the fetch proves capture + amount. Activation
 * is a single atomic updateMany so a webhook + this route can't double-finalize.
 */
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const c = await prisma.contribution.findUnique({ where: { id: body.contributionId } })
    if (!c) return badRequest("Contribution not found")
    if (c.razorpayOrderId !== body.razorpayOrderId) return badRequest("Order mismatch")
    if (c.status === "paid") return ok({ alreadyPaid: true, showOnWall: c.showOnWall, needsApproval: !c.approved })
    if (c.status !== "pending") return badRequest("Contribution is not payable")

    const valid = verifyPaymentSignature({
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    })
    if (!valid) return badRequest("Invalid signature")

    const payment = await getRazorpay().payments.fetch(body.razorpayPaymentId)
    if (payment.status !== "captured" || Number(payment.amount) !== c.amountPaise) {
      return badRequest("Payment not captured for the expected amount")
    }

    const claimed = await prisma.contribution.updateMany({
      where: { id: c.id, status: "pending" },
      data: { status: "paid", razorpayPaymentId: body.razorpayPaymentId, paidAt: new Date() },
    })
    if (claimed.count === 0) return ok({ alreadyPaid: true, showOnWall: c.showOnWall, needsApproval: !c.approved })

    // Email the certificate (link + PDF + IG-story PNG). Best-effort — never
    // block the response, and the certificate is always available at its URL.
    if (c.email) {
      await sendCertificateEmail(
        {
          id: c.id,
          name: c.displayName ?? "A generous supporter",
          amountPaise: c.amountPaise,
          tier: (c.tier as SponsorTier) ?? "silver",
          kind: c.kind === "company" ? "company" : "individual",
          paidAt: new Date(),
        },
        c.email,
      )
    }

    // Wall display still needs admin approval; anonymous gifts never surface.
    return ok({ showOnWall: c.showOnWall && !c.isAnonymous, needsApproval: c.showOnWall })
  } catch (e) {
    return handleError(e)
  }
}
