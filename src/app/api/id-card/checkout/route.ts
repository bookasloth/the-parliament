import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { buildReceipt, getRazorpay, publicKeyId } from "@/lib/razorpay"
import { ID_CARD_PRICE_PAISE, ID_CARD_DELIVERY_PAISE, ID_CARD_MAX_QTY, idCardTotalPaise } from "@/config/id-card"
import { audit } from "@/lib/audit"

const schema = z.object({
  qty: z.number().int().min(1).max(ID_CARD_MAX_QTY),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(20),
  addressLine: z.string().trim().min(6).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const input = schema.parse(await req.json())

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, legalName: true },
    })
    if (!dbUser) return badRequest("User not found")

    // Authoritative total — recomputed server-side; the client's amount is never trusted.
    const amountPaise = idCardTotalPaise(input.qty)
    const rzp = getRazorpay()
    const receipt = buildReceipt(user.id)

    const order = await prisma.idCardOrder.create({
      data: {
        userId: user.id,
        qty: input.qty,
        cardPricePaise: ID_CARD_PRICE_PAISE,
        deliveryPaise: ID_CARD_DELIVERY_PAISE,
        amountPaise,
        currency: "INR",
        status: "created",
        recipientName: input.recipientName,
        phone: input.phone,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
      },
    })

    const rzpOrder = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: { userId: user.id, kind: "id_card", orderId: order.id, qty: String(input.qty) },
    })

    await prisma.idCardOrder.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id, status: "attempted" },
    })

    await audit({
      actorId: user.id,
      action: "idcard.checkout.order",
      entityType: "id_card_order",
      entityId: order.id,
      payload: { qty: input.qty, razorpayOrderId: rzpOrder.id, amountPaise },
    })

    return ok({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amountPaise,
      currency: "INR",
      keyId: publicKeyId(),
      customer: { name: dbUser.legalName, email: dbUser.email },
    })
  } catch (e) {
    return handleError(e)
  }
}
