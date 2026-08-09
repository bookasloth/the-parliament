"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, X, Crown, Medal, Award, HeartHandshake, Loader2, PartyPopper } from "lucide-react"
import { SPONSOR_TIERS, tierById, rupees, type SponsorTier, type TierDef } from "@/config/sponsor"
import { ACCENT_HEX } from "@/components/marketing/primitives"

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

const TIER_ICON: Record<SponsorTier, typeof Crown> = { platinum: Crown, gold: Medal, silver: Award }

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

/** Tier cards — each opens the contribution modal preset to that tier. */
export function SponsorSection() {
  const [openTier, setOpenTier] = useState<TierDef | null>(null)

  return (
    <>
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {SPONSOR_TIERS.map((t, i) => {
          const Icon = TIER_ICON[t.id]
          const hex = ACCENT_HEX[t.accent]
          const featured = t.id === "platinum"
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative flex h-full flex-col rounded-[6px] bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 ${
                featured
                  ? "shadow-[0_24px_60px_-24px_rgba(26,26,26,0.28)] ring-2"
                  : "border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_44px_-20px_rgba(26,26,26,0.22)]"
              }`}
              style={featured ? ({ ["--tw-ring-color" as string]: hex }) : undefined}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[3px] px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: hex }}>
                  For companies
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[6px] transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `${hex}18`, color: hex }}>
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-[#1a1a1a]">{t.label}</h3>
                  <p className="text-sm font-medium" style={{ color: hex }}>from {rupees(t.minPaise)}</p>
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-[#5b5b5b]">{t.blurb}</p>
              <ul className="mt-5 space-y-2.5 border-t border-black/5 pt-5">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-[#3a3a3a]">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px]" style={{ backgroundColor: `${hex}1a`, color: hex }}>
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setOpenTier(t)}
                className={`mt-6 rounded-[3px] px-5 py-3 text-center text-sm font-semibold transition ${
                  featured ? "text-white hover:opacity-90" : "border border-black/10 text-[#1a1a1a] hover:border-black/25"
                }`}
                style={featured ? { backgroundColor: hex } : undefined}
              >
                {t.hasLogo ? "Add our company" : "Add my name"}
              </button>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {openTier && <ContributeModal tier={openTier} onClose={() => setOpenTier(null)} />}
      </AnimatePresence>
    </>
  )
}

/** Preset-amount "Support NNAWCA" box for the funding section. */
export function SupportBox() {
  const [openTier, setOpenTier] = useState<TierDef | null>(null)
  const [preset, setPreset] = useState<number | undefined>()
  const presets = [100, 250, 500, 1000] // ₹

  return (
    <>
      <div className="mx-auto mt-10 max-w-lg rounded-[8px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.16em] text-white/50">Support NNAWCA</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {presets.map((r) => (
            <button
              key={r}
              onClick={() => { setPreset(r); setOpenTier(tierById(r >= 500 ? "gold" : "silver")!) }}
              className="rounded-[5px] border border-white/15 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
            >
              ₹{r.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setPreset(undefined); setOpenTier(tierById("silver")!) }}
          className="mt-3 w-full rounded-[5px] bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Contribute another amount
        </button>
        <p className="mt-3 text-center text-[11px] text-white/40">Goes to NNAWCA · UPI, card or netbanking · Razorpay</p>
      </div>

      <AnimatePresence>
        {openTier && <ContributeModal tier={openTier} presetRupees={preset} onClose={() => { setOpenTier(null); setPreset(undefined) }} />}
      </AnimatePresence>
    </>
  )
}

function ContributeModal({ tier: initialTier, presetRupees, onClose }: { tier: TierDef; presetRupees?: number; onClose: () => void }) {
  const [tier, setTier] = useState<TierDef>(initialTier)
  const [amount, setAmount] = useState<string>(String(presetRupees ?? initialTier.minPaise / 100))
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [email, setEmail] = useState("")
  const [anon, setAnon] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [done, setDone] = useState(false)
  const [certId, setCertId] = useState<string | null>(null)

  const hex = ACCENT_HEX[tier.accent]
  const kind: "individual" | "company" = tier.hasLogo ? "company" : "individual"
  const paise = Math.round(Number(amount) * 100)
  const amountValid = Number.isFinite(paise) && paise >= tier.minPaise
  const nameValid = name.trim().length > 0 // always needed — every giver gets a certificate
  const canPay = amountValid && nameValid && !busy

  function switchTier(id: SponsorTier) {
    const t = tierById(id)!
    setTier(t)
    if (Math.round(Number(amount) * 100) < t.minPaise) setAmount(String(t.minPaise / 100))
    setMsg("")
  }

  async function pay() {
    setBusy(true)
    setMsg("")
    try {
      const res = await fetch("/api/contribute/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          amountPaise: paise,
          showOnWall: true,
          isAnonymous: anon,
          displayName: name.trim(),
          websiteUrl: website.trim() || undefined,
          logoUrl: kind === "company" ? logoUrl.trim() || undefined : undefined,
          email: email.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Couldn't start checkout")

      const loaded = await loadRazorpay()
      if (!loaded || !window.Razorpay) throw new Error("Could not load the payment window")

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountPaise,
        currency: data.currency,
        name: "NNAWCA",
        description: `Contribution to NNAWCA · ${tier.label}`,
        prefill: { name: anon ? undefined : name.trim(), email: email.trim() || undefined },
        theme: { color: hex },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setMsg("Verifying payment…")
          const v = await fetch("/api/contribute/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contributionId: data.contributionId,
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
            }),
          })
          if (!v.ok) {
            const vd = await v.json().catch(() => ({}))
            setMsg(vd.error ?? "Verification failed — contact us if you were charged")
            setBusy(false)
            return
          }
          setCertId(data.contributionId)
          setDone(true)
          setBusy(false)
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
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[8px] bg-white shadow-2xl"
        initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pt-6 pb-5" style={{ background: `linear-gradient(135deg, ${hex}14, transparent)` }}>
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600"><X className="h-5 w-5" /></button>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[6px]" style={{ backgroundColor: `${hex}1f`, color: hex }}>
              <HeartHandshake className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-semibold text-gray-900">Support NNAWCA</h3>
              <p className="text-sm text-gray-500">Goes to the association. Your name joins the wall.</p>
            </div>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <motion.span className="flex h-16 w-16 items-center justify-center rounded-full text-white" style={{ backgroundColor: ACCENT_HEX[3] }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
              <PartyPopper className="h-8 w-8" />
            </motion.span>
            <h4 className="mt-5 font-heading text-xl font-semibold text-gray-900">Thank you, {name.trim().split(" ")[0]}!</h4>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Payment received by NNAWCA. Your certificate is ready.{" "}
              {anon ? "Your gift stays off the public wall." : "Your name joins the wall once the team confirms it — usually within a day."}
            </p>
            {certId && (
              <a
                href={`/certificate/${certId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-[4px] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: hex }}
              >
                <Award className="h-4 w-4" /> View your certificate
              </a>
            )}
            <button onClick={onClose} className="mt-2 w-full rounded-[4px] border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Done</button>
          </div>
        ) : (
          <div className="px-6 py-5">
            <div className="grid grid-cols-3 gap-2">
              {SPONSOR_TIERS.map((t) => {
                const active = t.id === tier.id
                const th = ACCENT_HEX[t.accent]
                return (
                  <button key={t.id} onClick={() => switchTier(t.id)} className="rounded-[5px] border py-2 text-center text-xs font-semibold transition"
                    style={active ? { borderColor: th, backgroundColor: `${th}12`, color: th } : { borderColor: "rgba(0,0,0,0.1)", color: "#6b7280" }}>
                    {t.label}
                    <span className="mt-0.5 block text-[10px] font-medium opacity-70">from {rupees(t.minPaise)}</span>
                  </button>
                )
              })}
            </div>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</label>
            <div className="mt-1.5 flex items-center rounded-[5px] border border-gray-200 px-3 focus-within:border-gray-400">
              <span className="text-gray-500">₹</span>
              <input type="number" min={tier.minPaise / 100} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" />
            </div>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 5].map((m) => (
                <button key={m} onClick={() => setAmount(String((tier.minPaise / 100) * m))} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-gray-400">
                  {rupees(tier.minPaise * m)}
                </button>
              ))}
            </div>
            {!amountValid && amount !== "" && (
              <p className="mt-1.5 text-xs" style={{ color: ACCENT_HEX[1] }}>{tier.label} needs at least {rupees(tier.minPaise)}.</p>
            )}

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              {kind === "company" ? "Company name" : "Name for the wall"}
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "company" ? "Company Pvt. Ltd." : "e.g. Suresh N."} maxLength={80}
              className="mt-1.5 w-full rounded-[5px] border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400" />
            <p className="mt-1 text-[11px] text-gray-400">Goes on your certificate.</p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              {kind === "company" ? "Website" : "Website / profile link"} <span className="font-normal normal-case text-gray-400">(optional)</span>
            </label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" maxLength={200}
              className="mt-1.5 w-full rounded-[5px] border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400" />

            {kind === "company" && (
              <>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">Logo URL <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" maxLength={300}
                  className="mt-1.5 w-full rounded-[5px] border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400" />
              </>
            )}

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">Email for receipt <span className="font-normal normal-case text-gray-400">(optional)</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" maxLength={200}
              className="mt-1.5 w-full rounded-[5px] border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400" />

            <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Keep my name off the public wall (you still get your certificate)
            </label>

            <button onClick={pay} disabled={!canPay}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[5px] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: hex }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Please wait…" : amountValid ? `Pay ${rupees(paise)}` : "Pay"}
            </button>
            <p className="mt-2.5 text-center text-[11px] text-gray-400">Secured by Razorpay · Paid to NNAWCA</p>
            {msg && <p className="mt-2 text-center text-xs text-gray-500">{msg}</p>}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
