import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { adminRefund } from "@/modules/membership/admin";

// L12: an admin refund must never exceed the amount actually charged for the
// order (guards a mistyped/oversized refund on the admin-only path).

const rnd = () => Math.random().toString(36).slice(2);

async function seedPaidOrder(amountPaise: number) {
  const user = await prisma.user.create({
    data: { email: `ref-${rnd()}@test.local`, legalName: "Refundee" },
  });
  const order = await prisma.membershipOrder.create({
    data: {
      userId: user.id,
      planCode: "associate",
      amountPaise,
      status: "paid",
      razorpayOrderId: `order_${rnd()}`,
    },
  });
  return { adminId: user.id, orderId: order.id };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("adminRefund amount clamp", () => {
  it("rejects a refund larger than the order amount", async () => {
    const { adminId, orderId } = await seedPaidOrder(99900);
    await expect(
      adminRefund({ adminId, orderId, reason: "oops", razorpayRefundId: `rfnd_${rnd()}`, amountPaise: 200000 }),
    ).rejects.toThrow(/exceeds the order amount/);
  });

  it("rejects a non-positive refund amount", async () => {
    const { adminId, orderId } = await seedPaidOrder(99900);
    await expect(
      adminRefund({ adminId, orderId, reason: "zero", razorpayRefundId: `rfnd_${rnd()}`, amountPaise: 0 }),
    ).rejects.toThrow(/exceeds the order amount/);
  });

  it("allows a refund up to the order amount", async () => {
    const { adminId, orderId } = await seedPaidOrder(99900);
    const refund = await adminRefund({
      adminId, orderId, reason: "valid", razorpayRefundId: `rfnd_${rnd()}`, amountPaise: 99900,
    });
    expect(refund.amountPaise).toBe(99900);
    const order = await prisma.membershipOrder.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("refunded");
  });
});
