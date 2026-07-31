import { describe, it, expect } from "vitest";
import { checkCapturedPayment } from "@/modules/membership/payment-guard";

// M1: /verify must confirm the payment actually settled, not just that the
// signature is authentic.

const order = { amountPaise: 99900, razorpayOrderId: "order_abc" };

describe("checkCapturedPayment", () => {
  it("accepts a captured payment for the right amount and order", () => {
    expect(checkCapturedPayment({ status: "captured", amount: 99900, order_id: "order_abc" }, order)).toEqual({ ok: true });
    // Razorpay may send amount as a numeric string.
    expect(checkCapturedPayment({ status: "captured", amount: "99900", order_id: "order_abc" }, order).ok).toBe(true);
  });

  it("rejects a payment that is not captured (authorized-only has a valid sig)", () => {
    const r = checkCapturedPayment({ status: "authorized", amount: 99900, order_id: "order_abc" }, order);
    expect(r).toMatchObject({ ok: false, reason: "Payment not captured" });
  });

  it("rejects an amount that does not match the order (price tampering)", () => {
    const r = checkCapturedPayment({ status: "captured", amount: 100, order_id: "order_abc" }, order);
    expect(r).toMatchObject({ ok: false });
  });

  it("rejects a payment made against a different razorpay order", () => {
    const r = checkCapturedPayment({ status: "captured", amount: 99900, order_id: "order_evil" }, order);
    expect(r).toMatchObject({ ok: false });
  });

  it("skips the order-id check when the order has no razorpayOrderId yet", () => {
    const r = checkCapturedPayment({ status: "captured", amount: 99900, order_id: "anything" }, { amountPaise: 99900, razorpayOrderId: null });
    expect(r.ok).toBe(true);
  });
});
