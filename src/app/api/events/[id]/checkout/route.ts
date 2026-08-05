import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { buildReceipt, getRazorpay, publicKeyId } from "@/lib/razorpay"
import { isRegistered } from "@/modules/events/orders"
import { audit } from "@/lib/audit"

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: eventId } = await ctx.params

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, priceInPaise: true, status: true },
    })
    if (!event || event.status === "cancelled") return badRequest("Event not available")
    if (event.priceInPaise <= 0) return badRequest("This event is free — just RSVP")
    if (await isRegistered(eventId, user.id)) return badRequest("Already registered")

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, legalName: true } })
    if (!dbUser) return badRequest("User not found")

    const order = await prisma.eventOrder.create({
      data: { eventId, userId: user.id, amountPaise: event.priceInPaise, currency: "INR", status: "created" },
    })

    const rzp = getRazorpay()
    const rzpOrder = await rzp.orders.create({
      amount: event.priceInPaise,
      currency: "INR",
      receipt: buildReceipt(user.id),
      notes: { userId: user.id, eventId, orderId: order.id, kind: "event" },
    })

    await prisma.eventOrder.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id, status: "attempted" },
    })

    await audit({
      actorId: user.id, action: "event.checkout.order", entityType: "event_order", entityId: order.id,
      payload: { eventId, razorpayOrderId: rzpOrder.id, amountPaise: event.priceInPaise },
    })

    return ok({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amountPaise: event.priceInPaise,
      currency: "INR",
      keyId: publicKeyId(),
      eventTitle: event.title,
      customer: { name: dbUser.legalName, email: dbUser.email },
    })
  } catch (e) {
    return handleError(e)
  }
}
