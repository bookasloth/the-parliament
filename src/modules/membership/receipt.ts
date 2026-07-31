import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { PLANS, type PlanCode } from "@/config/membership"
import { issueInvoiceForOrder } from "./invoice"

export interface ReceiptVarsInput {
  legalName: string
  planCode: PlanCode
  amountPaise: number
  invoiceId: string
  invoiceNumber: string
  baseUrl: string
}

/**
 * Pure: build the payment_receipt template variables. Extracted so the money-path
 * formatting (rupee amount, invoice download URL) is unit-testable without a DB.
 * The invoice URL points at the authed app route (not a raw signed R2 link), so it
 * survives in an email and re-signs on click.
 */
export function receiptVars(input: ReceiptVarsInput) {
  return {
    legalName: input.legalName,
    planName: PLANS[input.planCode].displayName,
    amountInr: (input.amountPaise / 100).toFixed(2),
    invoiceNumber: input.invoiceNumber,
    invoiceUrl: `${input.baseUrl.replace(/\/$/, "")}/api/membership/invoice/${input.invoiceId}`,
  }
}

/**
 * After a payment is claimed + the membership activated, give the member what they
 * paid for on the paperwork side: a numbered invoice PDF and a receipt email.
 *
 * BEST-EFFORT BY DESIGN — this NEVER throws. The membership is already granted by
 * the time we get here; a failed invoice upload or a flaky SMTP host must not undo
 * that or fail the caller (POST /verify or the Razorpay webhook). Both steps are
 * idempotent (issueInvoiceForOrder returns the existing row; the claim only fires
 * once), so a webhook retry won't double-send.
 *
 * ponytail: runs inline in the request path today. When pg-boss is actually booted,
 * move this to an async job so slow SMTP never adds latency to /verify.
 */
export async function issueReceiptAndInvoice(orderId: string): Promise<void> {
  try {
    const order = await prisma.membershipOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, legalName: true, displayName: true } } },
    })
    if (!order || order.status !== "paid") return

    const invoice = await issueInvoiceForOrder({ orderId })

    const vars = receiptVars({
      legalName: order.user.displayName || order.user.legalName,
      planCode: order.planCode as PlanCode,
      amountPaise: order.amountPaise,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      baseUrl: process.env.AUTH_URL || "https://nnawca.org",
    })

    await sendEmail("payment_receipt", order.user.email, vars, order.userId)
  } catch (e) {
    // Never rethrow — the membership is already active. Surfaced in logs so a
    // missing receipt can be reissued rather than silently lost.
    console.error("[membership:receipt] failed for order", orderId, (e as Error).message)
  }
}
