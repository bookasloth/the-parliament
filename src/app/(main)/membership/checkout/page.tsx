"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

// Razorpay's checkout.js attaches a global constructor.
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

type Status = "starting" | "opening" | "verifying" | "success" | "cancelled" | "error"

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const plan = params.get("plan") ?? "life"
  const platformFee = params.get("platformFee") === "1"
  const donate = params.get("donate") === "1"
  const promoCode = params.get("promo") || undefined
  const started = useRef(false)
  const [status, setStatus] = useState<Status>("starting")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (started.current) return // guard against React strict-mode double-run
    started.current = true

    async function run() {
      // 1. Create the order server-side.
      const res = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: plan, refundPolicyAcknowledged: true, platformFee, donate, promoCode }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setStatus("error")
        setMessage(err.error || "Could not start checkout")
        return
      }
      const data = await res.json()

      if (data.kind !== "order") {
        setStatus("error")
        setMessage("Subscription plans need Razorpay Plan IDs configured. Only one-time (Life) works right now.")
        return
      }

      // 2. Load Razorpay checkout.js.
      const ok = await loadRazorpayScript()
      if (!ok || !window.Razorpay) {
        setStatus("error")
        setMessage("Failed to load Razorpay checkout.")
        return
      }

      // 3. Open the payment modal.
      setStatus("opening")
      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountPaise,
        currency: data.currency,
        name: "NNAWCA",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} membership — contribution to NNAWCA`,
        prefill: { name: data.customer?.name, email: data.customer?.email },
        theme: { color: "#009ae4" },
        modal: {
          ondismiss: () => {
            setStatus("cancelled")
            setMessage("Payment cancelled.")
          },
        },
        handler: async (resp: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          // 4. Verify server-side → activates membership.
          setStatus("verifying")
          const v = await fetch("/api/membership/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            }),
          })
          if (!v.ok) {
            const err = await v.json().catch(() => ({}))
            setStatus("error")
            setMessage(err.error || "Payment verification failed.")
            return
          }
          setStatus("success")
          setMessage("Payment verified — your membership is now active.")
          setTimeout(() => router.push("/membership?upgraded=1"), 1500)
        },
      })
      rzp.open()
    }

    run().catch((e) => {
      setStatus("error")
      setMessage(e?.message || "Something went wrong.")
    })
  }, [plan, platformFee, donate, promoCode, router])

  const copy: Record<Status, string> = {
    starting: "Setting up your payment…",
    opening: "Opening the secure payment window…",
    verifying: "Verifying your payment…",
    success: message,
    cancelled: message,
    error: message,
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      {(status === "starting" || status === "opening" || status === "verifying") && (
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      )}
      <p className={`text-sm ${status === "error" ? "text-red-600" : "text-gray-600"}`}>
        {copy[status]}
      </p>
      {(status === "error" || status === "cancelled") && (
        <a
          href="/membership"
          className="mt-6 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Back to Membership
        </a>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  )
}
