import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { getCurrent } from "@/modules/membership/service"
import { tierHasCalling, STUDENT_PASS } from "@/config/calls"
import { buildReceipt, getRazorpay, publicKeyId } from "@/lib/razorpay"

/**
 * POST /api/calls/pack/checkout — start a Razorpay order for a student's
 * ₹30 / 30-min call pass. Only offered to tiers WITHOUT included calling
 * (students / inactive) — members already have quota, so they can't buy one.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()

    const { planCode } = await getCurrent(user.id)
    if (tierHasCalling(planCode)) {
      return badRequest("Your membership already includes calling.")
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, legalName: true },
    })
    if (!dbUser) return badRequest("User not found")

    // Create the pass in a pending state — only a verified payment activates it.
    const expiresAt = new Date(Date.now() + STUDENT_PASS.ttlDays * 86_400_000)
    const pass = await prisma.callPass.create({
      data: { userId: user.id, minutes: STUDENT_PASS.minutes, status: "pending", expiresAt },
    })

    const rzp = getRazorpay()
    const rzpOrder = await rzp.orders.create({
      amount: STUDENT_PASS.pricePaise,
      currency: "INR",
      receipt: buildReceipt(user.id),
      notes: { userId: user.id, kind: "call_pack", passId: pass.id },
    })

    await prisma.callPass.update({ where: { id: pass.id }, data: { orderId: rzpOrder.id } })

    return ok({
      passId: pass.id,
      razorpayOrderId: rzpOrder.id,
      amountPaise: STUDENT_PASS.pricePaise,
      currency: "INR",
      keyId: publicKeyId(),
      customer: { name: dbUser.legalName, email: dbUser.email },
    })
  } catch (e) {
    return handleError(e)
  }
}
