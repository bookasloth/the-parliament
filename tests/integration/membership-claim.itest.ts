import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { claimAndActivateOrder } from "@/modules/membership/claim";

// H2 regression: the client POST /verify and the payment.captured webhook race
// each other on a successful payment. Without an atomic claim both activate the
// same order and the user ends up with two active memberships for one payment.

const rnd = () => Math.random().toString(36).slice(2);

async function seedOrder() {
  const user = await prisma.user.create({
    data: { email: `pay-${rnd()}@test.local`, legalName: "Payer" },
  });
  const order = await prisma.membershipOrder.create({
    data: {
      userId: user.id,
      planCode: "associate",
      amountPaise: 99900,
      status: "created",
      razorpayOrderId: `order_${rnd()}`,
    },
  });
  return { userId: user.id, orderId: order.id };
}

async function activeMembershipCount(userId: string) {
  return prisma.membership.count({ where: { userId, status: "active" } });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("claimAndActivateOrder — double-credit race", () => {
  it("two concurrent claims on one order activate exactly once", async () => {
    const { userId, orderId } = await seedOrder();

    const [a, b] = await Promise.all([
      claimAndActivateOrder(orderId, { razorpayPaymentId: `pay_${rnd()}` }),
      claimAndActivateOrder(orderId, { razorpayPaymentId: `pay_${rnd()}` }),
    ]);

    // Exactly one caller wins the claim; the other no-ops.
    expect([a.claimed, b.claimed].filter(Boolean)).toHaveLength(1);
    // And the DB has exactly one active membership for the payment.
    expect(await activeMembershipCount(userId)).toBe(1);

    const order = await prisma.membershipOrder.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("paid");
  });

  it("re-claiming an already-paid order does not create a second membership", async () => {
    const { userId, orderId } = await seedOrder();

    const first = await claimAndActivateOrder(orderId, { razorpayPaymentId: `pay_${rnd()}` });
    expect(first.claimed).toBe(true);

    const second = await claimAndActivateOrder(orderId, { razorpayPaymentId: `pay_${rnd()}` });
    expect(second.claimed).toBe(false); // idempotent — webhook retries hit this path

    expect(await activeMembershipCount(userId)).toBe(1);
  });

  it("returns claimed:false for a nonexistent order", async () => {
    const res = await claimAndActivateOrder(
      "00000000-0000-0000-0000-000000000000",
      { razorpayPaymentId: `pay_${rnd()}` },
    );
    expect(res.claimed).toBe(false);
  });
});
