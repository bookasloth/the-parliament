import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/razorpay"
import { activateMembership } from "@/modules/membership/activation"
import { audit } from "@/lib/audit"
import { type PlanCode } from "@/config/membership"

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-razorpay-signature")

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let payload: { event: string; payload: Record<string, unknown> }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    switch (payload.event) {
      case "payment.captured":
        await handlePaymentCaptured(payload.payload)
        break
      case "payment.failed":
        await handlePaymentFailed(payload.payload)
        break
      case "subscription.charged":
        await handleSubscriptionCharged(payload.payload)
        break
      case "subscription.activated":
        await handleSubscriptionActivated(payload.payload)
        break
      case "subscription.cancelled":
      case "subscription.halted":
      case "subscription.completed":
        await handleSubscriptionEnded(payload.payload, payload.event)
        break
      case "refund.processed":
        await handleRefundProcessed(payload.payload)
        break
      default:
        await audit({ action: `razorpay.webhook.${payload.event}`, payload: { skipped: true } })
    }
    return NextResponse.json({ received: true })
  } catch (e) {
    console.error("Razorpay webhook error:", e)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }
}

interface RzpPayloadShape {
  payment?: { entity: { id: string; order_id?: string; status: string; notes?: Record<string, string> } }
  subscription?: { entity: { id: string; plan_id?: string; status: string; current_end?: number; notes?: Record<string, string> } }
  refund?: { entity: { id: string; payment_id: string; amount: number; status: string } }
}

async function handlePaymentCaptured(payload: Record<string, unknown>) {
  const p = (payload as RzpPayloadShape).payment?.entity
  if (!p) return
  const order = await prisma.membershipOrder.findFirst({
    where: { razorpayOrderId: p.order_id },
  })
  if (!order) return
  if (order.status === "paid") return

  const planCode = (p.notes?.planCode ?? order.planCode) as PlanCode
  const activation = await activateMembership({
    userId: order.userId,
    planCode,
    source: "purchase",
    amountPaise: order.amountPaise,
    orderId: order.id,
  })

  await prisma.membershipOrder.update({
    where: { id: order.id },
    data: { status: "paid", razorpayPaymentId: p.id, capturedAt: new Date() },
  })

  await audit({
    action: "razorpay.webhook.payment.captured",
    entityType: "membership_order",
    entityId: order.id,
    payload: { membershipId: activation.membershipId },
  })
}

async function handlePaymentFailed(payload: Record<string, unknown>) {
  const p = (payload as RzpPayloadShape).payment?.entity
  if (!p) return
  const order = await prisma.membershipOrder.findFirst({
    where: { razorpayOrderId: p.order_id },
  })
  if (!order) return
  await prisma.membershipOrder.update({
    where: { id: order.id },
    data: { status: "failed", razorpayPaymentId: p.id },
  })
}

async function handleSubscriptionActivated(payload: Record<string, unknown>) {
  const s = (payload as RzpPayloadShape).subscription?.entity
  if (!s) return
  const userId = s.notes?.userId
  const planCode = s.notes?.planCode as PlanCode | undefined
  if (!userId || !planCode) return

  const exists = await prisma.membership.findFirst({
    where: { razorpaySubscriptionId: s.id, status: "active" },
  })
  if (exists) return

  const order = await prisma.membershipOrder.findFirst({
    where: { razorpaySubscriptionId: s.id },
  })

  await activateMembership({
    userId,
    planCode,
    source: "purchase",
    amountPaise: order?.amountPaise ?? 0,
    orderId: order?.id,
    razorpaySubscriptionId: s.id,
  })

  if (order) {
    await prisma.membershipOrder.update({
      where: { id: order.id },
      data: { status: "paid", capturedAt: new Date() },
    })
  }
}

async function handleSubscriptionCharged(payload: Record<string, unknown>) {
  const s = (payload as RzpPayloadShape).subscription?.entity
  if (!s) return
  const userId = s.notes?.userId
  const planCode = s.notes?.planCode as PlanCode | undefined
  if (!userId || !planCode) return

  const order = await prisma.membershipOrder.findFirst({
    where: { razorpaySubscriptionId: s.id },
    orderBy: { createdAt: "desc" },
  })

  await activateMembership({
    userId,
    planCode,
    source: "renewal",
    amountPaise: order?.amountPaise ?? 0,
    orderId: order?.id,
    razorpaySubscriptionId: s.id,
  })
}

async function handleSubscriptionEnded(payload: Record<string, unknown>, event: string) {
  const s = (payload as RzpPayloadShape).subscription?.entity
  if (!s) return
  await prisma.membership.updateMany({
    where: { razorpaySubscriptionId: s.id, status: "active" },
    data: { autoPay: false },
  })
  await audit({
    action: `razorpay.webhook.${event}`,
    payload: { subscriptionId: s.id },
  })
}

async function handleRefundProcessed(payload: Record<string, unknown>) {
  const r = (payload as RzpPayloadShape).refund?.entity
  if (!r) return
  await prisma.membershipRefund.updateMany({
    where: { razorpayRefundId: r.id },
    data: { status: "processed", processedAt: new Date() },
  })
}
