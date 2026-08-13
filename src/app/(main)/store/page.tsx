"use client"

import { useState } from "react"
import { SHELL_PACKS } from "@/modules/economy/shells"
import { ShoppingBag, Sparkles } from "lucide-react"

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

export default function ShellStorePage() {
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [credited, setCredited] = useState<{ shells: number; balance: number } | null>(null)

  async function buyPack(packId: string) {
    setBusy(packId)
    setMsg(null)
    setCredited(null)
    try {
      const res = await fetch("/api/shells/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      })
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
        description: `${data.shells} Shells`,
        prefill: { name: data.customer?.name, email: data.customer?.email },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setMsg("Verifying payment…")
          const v = await fetch("/api/shells/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              packId,
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
            }),
          })
          const vd = await v.json().catch(() => ({}))
          if (!v.ok) {
            setMsg(vd.error ?? "Verification failed")
            setBusy(null)
            return
          }
          setCredited({ shells: vd.shells, balance: vd.newBalance })
          setMsg(null)
          setBusy(null)
        },
        modal: { ondismiss: () => { setBusy(null); setMsg("Payment cancelled") } },
      })
      rzp.open()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong")
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Shell Store</h1>
            <p className="text-sm text-gray-500">Buy shells to use on events, membership renewal & streak restores</p>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {credited && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="font-semibold text-green-800">
            🐚 {credited.shells} shells credited! New balance: {credited.balance}
          </p>
        </div>
      )}

      {/* Error / status */}
      {msg && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {msg}
        </div>
      )}

      {/* Pack grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SHELL_PACKS.map((pack) => {
          const effective = (pack.priceInr / pack.shells).toFixed(2)
          const isBuying = busy === pack.id
          return (
            <div
              key={pack.id}
              className="relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              {pack.bonus > 0 && (
                <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  <Sparkles className="h-3 w-3" /> +{pack.bonus} bonus
                </span>
              )}

              <div className="mb-3 text-center">
                <span className="text-3xl">🐚</span>
                <p className="mt-1 text-2xl font-bold text-gray-900">{pack.shells}</p>
                <p className="text-xs text-gray-500">shells</p>
              </div>

              <div className="mb-4 space-y-1 text-center text-sm text-gray-600">
                <p className="text-lg font-semibold text-gray-900">₹{pack.priceInr}</p>
                <p className="text-xs text-gray-400">₹{effective}/shell</p>
              </div>

              <button
                onClick={() => buyPack(pack.id)}
                disabled={!!busy}
                className="mt-auto w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBuying ? "Processing…" : "Buy Now"}
              </button>
            </div>
          )
        })}
      </div>

      {/* Info section */}
      <div className="mt-10 rounded-xl border border-gray-100 bg-gray-50 p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">What can I do with Shells?</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sky-500">•</span>
            <span><strong>Event tickets</strong> — pay up to 10% of your shell balance toward any event registration</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sky-500">•</span>
            <span><strong>Membership renewal</strong> — use shells as a discount on your next renewal</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sky-500">•</span>
            <span><strong>Streak restore</strong> — broken your Alfazy streak? Spend 2 shells to restore it</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sky-500">•</span>
            <span><strong>1 shell = ₹1</strong> at checkout (up to 10% of your balance per purchase)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
