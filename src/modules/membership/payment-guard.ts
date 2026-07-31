// The Razorpay payment signature only proves the (orderId, paymentId) pair is
// authentic — NOT that money actually settled. Before granting membership on the
// /verify path we fetch the payment and confirm it is captured, for the right
// amount, against the right order. (The payment.captured webhook already implies
// capture, so this guard is verify-specific.)

export interface PaymentLike {
  status: string
  amount: number | string
  order_id?: string | null
}

export interface OrderLike {
  amountPaise: number
  razorpayOrderId: string | null
}

export type PaymentCheck = { ok: true } | { ok: false; reason: string }

export function checkCapturedPayment(payment: PaymentLike, order: OrderLike): PaymentCheck {
  if (payment.status !== "captured") {
    return { ok: false, reason: "Payment not captured" }
  }
  if (Number(payment.amount) !== order.amountPaise) {
    return { ok: false, reason: "Payment amount does not match the order" }
  }
  if (order.razorpayOrderId && payment.order_id !== order.razorpayOrderId) {
    return { ok: false, reason: "Payment is for a different order" }
  }
  return { ok: true }
}
