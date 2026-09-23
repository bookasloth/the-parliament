"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

declare global {
  interface Window {
    Razorpay?: new (o: Record<string, unknown>) => { open: () => void }
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

interface Props {
  username: string
  cardPriceLabel: string // e.g. "₹100"
  deliveryLabel: string // e.g. "₹40"
  defaults: { recipientName: string; city: string }
}

export function OwnerActions({ username, cardPriceLabel, deliveryLabel, defaults }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    qty: 1,
    recipientName: defaults.recipientName,
    phone: "",
    addressLine: "",
    city: defaults.city === "India" ? "" : defaults.city,
    state: "",
    pincode: "",
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === "qty" ? Number(e.target.value) : e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/id-card/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Could not start checkout")

      const loaded = await loadRazorpayScript()
      if (!loaded || !window.Razorpay) throw new Error("Payment library failed to load")

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountPaise,
        currency: data.currency,
        name: "NNAWCA",
        description: `Printed alumni ID card ×${form.qty}`,
        prefill: { name: data.customer?.name, email: data.customer?.email, contact: form.phone },
        theme: { color: "#009ae4" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (resp: Record<string, string>) => {
          try {
            const v = await fetch("/api/id-card/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              }),
            })
            const vd = await v.json()
            if (!v.ok) throw new Error(vd?.error || "Payment verification failed")
            setOpen(false)
            router.push(`/${username}/my-id?ordered=1`)
            router.refresh()
          } catch (err) {
            setError(err instanceof Error ? err.message : "Verification failed")
            setBusy(false)
          }
        },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center gap-3 bg-gradient-to-t from-black/40 to-transparent px-4 pb-6 pt-10">
        <a
          href={`/${username}/my-id/card`}
          download={`nnawca-id-${username}.png`}
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Download card
        </a>
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-600"
        >
          Order printed card
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && setOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-gray-900">Order printed ID card</h2>
            <p className="mt-1 text-sm text-gray-500">
              {cardPriceLabel} per card + {deliveryLabel} delivery. Ships to the address below.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Recipient name" className="col-span-2" value={form.recipientName} onChange={set("recipientName")} required />
              <Field label="Phone" value={form.phone} onChange={set("phone")} required />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.qty}
                  onChange={set("qty")}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <Field label="Address" className="col-span-2" value={form.addressLine} onChange={set("addressLine")} required />
              <Field label="City" value={form.city} onChange={set("city")} required />
              <Field label="State" value={form.state} onChange={set("state")} required />
              <Field label="Pincode" value={form.pincode} onChange={set("pincode")} required />
            </div>

            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                {busy ? "Processing…" : "Pay & order"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function Field({
  label,
  className = "",
  ...props
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <input {...props} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
    </div>
  )
}
