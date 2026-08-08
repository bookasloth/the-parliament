"use client"

import { useState } from "react"
import { X, Video, Sparkles } from "lucide-react"

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

/**
 * Shown when a student without included calling tries to call. Sells the ₹30 /
 * 30-min pass, and nudges toward membership (the real conversion goal).
 * onPurchased fires after a verified payment — the caller retries the call.
 */
export default function CallPaywall({
  onClose,
  onPurchased,
}: {
  onClose: () => void
  onPurchased: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  async function buy() {
    setBusy(true)
    setMsg("")
    try {
      const res = await fetch("/api/calls/pack/checkout", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Couldn't start checkout")

      const loaded = await loadRazorpay()
      if (!loaded || !window.Razorpay) throw new Error("Could not load payment window")

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountPaise,
        currency: data.currency,
        name: "NNAWCA",
        description: "30-minute video call pass",
        prefill: { name: data.customer?.name, email: data.customer?.email },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setMsg("Verifying payment…")
          const v = await fetch("/api/calls/pack/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              passId: data.passId,
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
            }),
          })
          if (!v.ok) {
            const vd = await v.json().catch(() => ({}))
            setMsg(vd.error ?? "Verification failed")
            setBusy(false)
            return
          }
          onPurchased()
        },
        modal: { ondismiss: () => { setBusy(false); setMsg("Payment cancelled") } },
      })
      rzp.open()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong")
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Video className="h-5 w-5" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Video calling is a member perk</h3>
        <p className="mt-1 text-sm text-gray-500">
          Buy a one-time 30-minute pass, or upgrade your membership for calling included every month.
        </p>

        <button
          onClick={buy}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? "Please wait…" : "Buy 30-min pass · ₹30"}
        </button>
        <a
          href="/membership"
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand/30 py-2.5 text-sm font-semibold text-brand hover:bg-brand/5"
        >
          <Sparkles className="h-4 w-4" /> Upgrade membership
        </a>
        {msg && <p className="mt-3 text-center text-xs text-gray-500">{msg}</p>}
      </div>
    </div>
  )
}
