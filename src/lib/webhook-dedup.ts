import { prisma } from "@/lib/prisma"

// Idempotency for incoming payment-provider webhooks. Razorpay retries a
// delivery on any non-2xx and can re-send the same event; without this a
// retried `subscription.charged` re-runs activation and resets the billing
// cycle. Dedup on the provider's unique event id (X-Razorpay-Event-Id).
//
// Record-AFTER-success (the route calls markEventProcessed only once the handler
// finished): a handler crash leaves the event unrecorded so the retry re-runs it
// — we prefer re-processing over silently dropping a payment event. Retries are
// sequential, so isEventProcessed catches them; concurrent same-event deliveries
// (rare) are additionally covered by the per-order claim in claimAndActivateOrder.

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const row = await prisma.processedWebhookEvent.findUnique({ where: { eventId } })
  return row !== null
}

export async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  try {
    await prisma.processedWebhookEvent.create({ data: { eventId, eventType } })
  } catch {
    // Unique-violation: a concurrent delivery already recorded it. Idempotent.
  }
}
