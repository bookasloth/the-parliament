"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ticket, Star, Check } from "lucide-react"
import { registerFreeAction, toggleInterestAction } from "../actions"

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`
}

export default function EventRegister({
  eventId,
  priceInPaise,
  registered: initialRegistered,
  interested: initialInterested,
  isPast,
  loggedIn,
}: {
  eventId: string
  priceInPaise: number
  registered: boolean
  interested: boolean
  isPast: boolean
  loggedIn: boolean
}) {
  const router = useRouter()
  const [registered, setRegistered] = useState(initialRegistered)
  const [interested, setInterested] = useState(initialInterested)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const paid = priceInPaise > 0

  async function registerFree() {
    setBusy(true); setMsg(null)
    const res = await registerFreeAction(eventId)
    setBusy(false)
    if (!res.ok) { setMsg(res.error ?? "Failed"); return }
    setRegistered(true); setInterested(false); router.refresh()
  }

  async function payAndRegister() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/events/${eventId}/checkout`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Checkout failed")

      const loaded = await loadRazorpay()
      if (!loaded || !window.Razorpay) throw new Error("Could not load payment window")

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountPaise,
        currency: data.currency,
        name: "NNAWCA",
        description: `Registration — ${data.eventTitle}`,
        prefill: { name: data.customer.name, email: data.customer.email },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setMsg("Verifying payment…")
          const v = await fetch(`/api/events/${eventId}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.orderId,
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
            }),
          })
          const vd = await v.json()
          if (!v.ok) { setMsg(vd.error || "Verification failed"); setBusy(false); return }
          setRegistered(true); setInterested(false); setMsg(null); setBusy(false); router.refresh()
        },
        modal: { ondismiss: () => { setBusy(false); setMsg("Payment cancelled") } },
      })
      rzp.open()
    } catch (e) {
      setBusy(false)
      setMsg(e instanceof Error ? e.message : "Payment failed")
    }
  }

  async function toggleInterest() {
    setBusy(true); setMsg(null)
    const res = await toggleInterestAction(eventId)
    setBusy(false)
    setInterested(res.interested)
    router.refresh()
  }

  if (!loggedIn) {
    return (
      <a href="/auth/signin" className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        Sign in to register
      </a>
    )
  }

  return (
    <div className="space-y-2">
      {/* Primary: Register (pay if priced) */}
      {registered ? (
        <div className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-700">
          <Check className="h-4 w-4" /> You&apos;re registered
        </div>
      ) : (
        <button
          onClick={paid ? payAndRegister : registerFree}
          disabled={busy || isPast}
          className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Ticket className="h-4 w-4" />
          {isPast ? "Registration closed" : paid ? `Register — ${rupees(priceInPaise)}` : "Register free"}
        </button>
      )}

      {/* Secondary: Interested (soft signal) */}
      {!registered && !isPast && (
        <button
          onClick={toggleInterest}
          disabled={busy}
          className={`flex items-center justify-center gap-1.5 w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            interested
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Star className={`h-4 w-4 ${interested ? "fill-brand-500 text-brand-500" : ""}`} />
          {interested ? "Interested" : "I'm interested"}
        </button>
      )}

      {msg && <p className="text-center text-xs text-gray-500">{msg}</p>}
    </div>
  )
}
