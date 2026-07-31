import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { isEventProcessed, markEventProcessed } from "@/lib/webhook-dedup";

// M2: Razorpay retries duplicate webhook deliveries with the same event id;
// the ledger lets the handler skip an event it already applied.

const rnd = () => Math.random().toString(36).slice(2);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("webhook idempotency ledger", () => {
  it("marks an event processed and detects the retry", async () => {
    const id = `evt_${rnd()}`;
    expect(await isEventProcessed(id)).toBe(false);

    await markEventProcessed(id, "subscription.charged");
    expect(await isEventProcessed(id)).toBe(true);
  });

  it("marking the same event twice is idempotent (unique-violation swallowed)", async () => {
    const id = `evt_${rnd()}`;
    await markEventProcessed(id, "payment.captured");
    await expect(markEventProcessed(id, "payment.captured")).resolves.toBeUndefined();

    const rows = await prisma.processedWebhookEvent.count({ where: { eventId: id } });
    expect(rows).toBe(1);
  });

  it("distinct events are tracked independently", async () => {
    const a = `evt_${rnd()}`;
    const b = `evt_${rnd()}`;
    await markEventProcessed(a, "subscription.charged");
    expect(await isEventProcessed(a)).toBe(true);
    expect(await isEventProcessed(b)).toBe(false);
  });
});
