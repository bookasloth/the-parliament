import crypto from "node:crypto"
import Razorpay from "razorpay"

let cachedClient: Razorpay | null = null

export function getRazorpay(): Razorpay {
  if (cachedClient) return cachedClient
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials missing")
  }
  cachedClient = new Razorpay({ key_id: keyId, key_secret: keySecret })
  return cachedClient
}

export function publicKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) throw new Error("RAZORPAY_KEY_ID missing")
  return keyId
}

export function verifyPaymentSignature(input: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET missing")
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex")
  return safeEqual(expected, input.signature)
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET missing")
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  return safeEqual(expected, signature)
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf-8")
  const bb = Buffer.from(b, "utf-8")
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function buildReceipt(userId: string): string {
  const epoch = Math.floor(Date.now() / 1000)
  return `nnawca_${userId.replace(/-/g, "").slice(0, 18)}_${epoch}`.slice(0, 40)
}
