import { prisma } from "@/lib/prisma"

export interface ClaimEventResult {
  claimed: boolean
  eventId?: string
}

/**
 * Atomically claim a paid event order and register the buyer exactly once.
 * Mirrors membership's claimAndActivateOrder: a single updateMany guarded on
 * `status != 'paid'` wins the race between the /verify POST and any webhook /
 * double-submit; the winner upserts the "going" RSVP (= the registration).
 */
export async function claimEventOrder(
  orderId: string,
  opts: { razorpayPaymentId: string; razorpaySignature?: string },
): Promise<ClaimEventResult> {
  const order = await prisma.eventOrder.findUnique({ where: { id: orderId } })
  if (!order) return { claimed: false }

  const claimed = await prisma.eventOrder.updateMany({
    where: { id: orderId, status: { not: "paid" } },
    data: {
      status: "paid",
      razorpayPaymentId: opts.razorpayPaymentId,
      razorpaySignature: opts.razorpaySignature,
      capturedAt: new Date(),
    },
  })
  if (claimed.count === 0) return { claimed: false }

  await prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId: order.eventId, userId: order.userId } },
    create: { eventId: order.eventId, userId: order.userId, status: "going" },
    update: { status: "going" },
  })

  return { claimed: true, eventId: order.eventId }
}

/** True if the user already holds a paid registration (a going RSVP) for the event. */
export async function isRegistered(eventId: string, userId: string): Promise<boolean> {
  const rsvp = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true },
  })
  return rsvp?.status === "going"
}
