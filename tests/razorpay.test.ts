import crypto from "node:crypto";
import { describe, it, expect, beforeAll } from "vitest";

// Security path: signature verification must reject tampered payloads.
const KEY_SECRET = "test_key_secret";
const WEBHOOK_SECRET = "test_webhook_secret";

beforeAll(() => {
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

function hmac(secret: string, body: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("razorpay signature verification", () => {
  it("accepts a valid payment signature and rejects a tampered one", async () => {
    const { verifyPaymentSignature } = await import("@/lib/razorpay");
    const orderId = "order_ABC";
    const paymentId = "pay_XYZ";
    const good = hmac(KEY_SECRET, `${orderId}|${paymentId}`);

    expect(verifyPaymentSignature({ orderId, paymentId, signature: good })).toBe(true);
    expect(
      verifyPaymentSignature({ orderId, paymentId, signature: good.slice(0, -1) + "0" }),
    ).toBe(false);
    expect(verifyPaymentSignature({ orderId, paymentId, signature: "short" })).toBe(false);
  });

  it("accepts a valid webhook signature and rejects a tampered body", async () => {
    const { verifyWebhookSignature } = await import("@/lib/razorpay");
    const body = JSON.stringify({ event: "payment.captured" });
    const good = hmac(WEBHOOK_SECRET, body);

    expect(verifyWebhookSignature(body, good)).toBe(true);
    expect(verifyWebhookSignature(body + " ", good)).toBe(false);
    expect(verifyWebhookSignature(body, "deadbeef")).toBe(false);
  });
});
