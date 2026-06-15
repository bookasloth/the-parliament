"use client"

import { useState } from "react"
import {
  ArrowLeft, Home, Users, Calendar, Menu, Plus, X,
  CheckCircle, ChevronRight, CreditCard, Ticket, User,
  Phone, Mail, MapPin, Shield, AlertCircle, Check,
  Building, ExternalLink, Download, Share2, Clock,
} from "lucide-react"

type Step = "details" | "ticket" | "review" | "payment" | "confirmation"

const STEPS: { key: Step; label: string }[] = [
  { key: "details", label: "Your Details" },
  { key: "ticket", label: "Ticket" },
  { key: "review", label: "Review" },
  { key: "payment", label: "Payment" },
]

const ticketTiers = [
  {
    id: "standard",
    name: "Standard Pass",
    price: 500,
    priceLabel: "₹500",
    desc: "All sessions, lunch on both days, gala dinner",
    perks: ["Both day access", "Lunch (Day 1 & 2)", "Gala dinner", "Event kit"],
    available: true,
  },
  {
    id: "premium",
    name: "Premium Pass",
    price: 1200,
    priceLabel: "₹1,200",
    desc: "Standard + T-shirt, yearbook, VIP seating at awards",
    perks: ["All Standard perks", "JNV Reunion T-shirt", "Exclusive yearbook", "VIP seating", "Priority registration"],
    available: true,
    recommended: true,
  },
]

const event = {
  title: "JNV Nagpur Grand Alumni Reunion 2025",
  date: "October 18–19, 2025",
  location: "JNV Nagpur Campus, Navegaon Khairi",
  cover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop",
  organizer: "NNAWCA",
  slug: "jnv-nagpur-grand-reunion-2025",
}

export default function EventRegisterPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [step, setStep] = useState<Step>("details")
  const [selectedTier, setSelectedTier] = useState("premium")
  const [qty, setQty] = useState(1)

  const [form, setForm] = useState({
    fullName: "Shubham Harne",
    email: "shubham@example.com",
    phone: "+91 98765 43210",
    batch: "2015",
    dietaryPreference: "vegetarian",
    accommodation: "no",
    tShirtSize: "M",
    specialNeeds: "",
    agreeTerms: false,
    agreeData: false,
  })
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi")
  const [upiId, setUpiId] = useState("")
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const tier = ticketTiers.find(t => t.id === selectedTier)!
  const subtotal = tier.price * qty
  const platformFee = Math.round(subtotal * 0.02)
  const gst = Math.round(subtotal * 0.18)
  const total = subtotal + platformFee + gst

  const stepIndex = STEPS.findIndex(s => s.key === step)

  function validateDetails() {
    const e: Record<string, string> = {}
    if (!form.fullName.trim()) e.fullName = "Name is required"
    if (!form.email.includes("@")) e.email = "Valid email required"
    if (!form.phone.trim()) e.phone = "Phone is required"
    if (!form.batch) e.batch = "Batch year is required"
    if (!form.agreeTerms) e.agreeTerms = "Please agree to the terms"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (step === "details" && !validateDetails()) return
    const idx = STEPS.findIndex(s => s.key === step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key)
    else processPayment()
  }

  function processPayment() {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setStep("confirmation")
    }, 2000)
  }

  const isConfirmation = step === "confirmation"

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-2xl items-center gap-2 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
          {!isConfirmation ? (
            <button
              onClick={() => {
                const idx = STEPS.findIndex(s => s.key === step)
                if (idx > 0) setStep(STEPS[idx - 1].key)
                else window.history.back()
              }}
              className="p-1.5 rounded-lg text-gray-500 hover:text-brand hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <span className="text-sm font-semibold text-gray-900">{isConfirmation ? "Booking Confirmed" : "Register for Event"}</span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">

        {/* Confirmation screen */}
        {isConfirmation ? (
          <div className="space-y-4">
            {/* Success hero */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-9 w-9 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">You're Registered!</h2>
              <p className="text-sm text-gray-500">Your booking for <span className="font-semibold">{event.title}</span> is confirmed.</p>
              <div className="mt-4 inline-flex items-center rounded-full bg-brand/10 px-4 py-1.5 text-xs font-bold text-brand">
                Booking ID: NNAWCA-2025-7834
              </div>
            </div>

            {/* Ticket card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="relative h-32">
                <img src={event.cover} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand/80 to-brand-700/80 flex items-center px-5 gap-4">
                  <Ticket className="h-10 w-10 text-white opacity-80 flex-shrink-0" />
                  <div>
                    <p className="text-white font-bold text-sm">{event.title}</p>
                    <p className="text-white/80 text-xs mt-0.5">{tier.name}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {/* Dotted divider */}
                <div className="border-t border-dashed border-gray-200 -mx-4 mb-4 relative">
                  <div className="absolute -left-3 -top-3 h-5 w-5 rounded-full bg-[#f3f2ef] border border-gray-200" />
                  <div className="absolute -right-3 -top-3 h-5 w-5 rounded-full bg-[#f3f2ef] border border-gray-200" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Attendee</p>
                    <p className="font-semibold text-gray-800">{form.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Ticket Type</p>
                    <p className="font-semibold text-gray-800">{tier.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Date</p>
                    <p className="font-semibold text-gray-800">{event.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Location</p>
                    <p className="font-semibold text-gray-800 truncate">{event.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Amount Paid</p>
                    <p className="font-bold text-brand">₹{total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
                    <p className="font-semibold text-gray-800">{qty} ticket{qty > 1 ? "s" : ""}</p>
                  </div>
                </div>
                {/* QR placeholder */}
                <div className="mt-4 flex justify-center">
                  <div className="h-24 w-24 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400 text-center p-2">QR Code will appear here</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <Download className="h-4 w-4" /> Download Ticket
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
            <p className="text-center text-xs text-gray-400">A confirmation has been sent to <span className="font-medium">{form.email}</span></p>
            <a href="/events" className="block text-center text-sm font-semibold text-brand hover:underline">← Back to Events</a>
          </div>
        ) : (
          <>
            {/* Progress stepper */}
            <div className="mb-4">
              <div className="flex items-center">
                {STEPS.map((s, i) => (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => i < stepIndex && setStep(s.key)}
                      className={`flex flex-col items-center gap-1 group ${i < stepIndex ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        s.key === step ? "bg-brand text-white ring-4 ring-brand/20" :
                        i < stepIndex ? "bg-green-500 text-white" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-medium hidden sm:block ${s.key === step ? "text-brand" : i < stepIndex ? "text-green-600" : "text-gray-400"}`}>{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${i < stepIndex ? "bg-green-400" : "bg-gray-200"}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Event summary strip */}
            <div className="flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-3 mb-4">
              <img src={event.cover} alt={event.title} className="h-12 w-16 rounded-lg object-cover flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" />{event.date}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</p>
              </div>
            </div>

            {/* Step: Your Details */}
            {step === "details" && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4">
                <h2 className="text-base font-bold text-gray-900">Attendee Details</h2>

                {[
                  { key: "fullName", label: "Full Name", type: "text", icon: <User className="h-4 w-4 text-gray-400" />, placeholder: "Enter your legal name" },
                  { key: "email", label: "Email Address", type: "email", icon: <Mail className="h-4 w-4 text-gray-400" />, placeholder: "your@email.com" },
                  { key: "phone", label: "Phone Number", type: "tel", icon: <Phone className="h-4 w-4 text-gray-400" />, placeholder: "+91 XXXXX XXXXX" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">{f.label} *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">{f.icon}</span>
                      <input
                        type={f.type}
                        value={(form as any)[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className={`w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm outline-none transition-all ${errors[f.key] ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/10"}`}
                      />
                    </div>
                    {errors[f.key] && <p className="mt-1 text-xs text-red-500">{errors[f.key]}</p>}
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Batch Year *</label>
                  <select
                    value={form.batch}
                    onChange={e => setForm(p => ({ ...p, batch: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${errors.batch ? "border-red-400" : "border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/10"}`}
                  >
                    <option value="">Select your batch</option>
                    {Array.from({ length: 26 }, (_, i) => 2000 + i).map(y => (
                      <option key={y} value={String(y)}>Batch {y}</option>
                    ))}
                  </select>
                  {errors.batch && <p className="mt-1 text-xs text-red-500">{errors.batch}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Dietary Preference</label>
                  <div className="flex gap-2 flex-wrap">
                    {["vegetarian", "non-vegetarian", "vegan", "jain"].map(d => (
                      <button key={d} onClick={() => setForm(p => ({ ...p, dietaryPreference: d }))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors capitalize ${form.dietaryPreference === d ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Accommodation Needed?</label>
                  <div className="flex gap-2">
                    {[{ v: "no", l: "No, I'll arrange" }, { v: "yes", l: "Yes, assist me" }].map(o => (
                      <button key={o.v} onClick={() => setForm(p => ({ ...p, accommodation: o.v }))}
                        className={`flex-1 rounded-lg border py-2.5 text-xs font-semibold transition-colors ${form.accommodation === o.v ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Special Needs / Accessibility</label>
                  <textarea
                    value={form.specialNeeds}
                    onChange={e => setForm(p => ({ ...p, specialNeeds: e.target.value }))}
                    placeholder="Any accessibility requirements or special requests…"
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 resize-none"
                  />
                </div>

                <div className="space-y-2.5 pt-1">
                  <label className={`flex items-start gap-2.5 cursor-pointer ${errors.agreeTerms ? "text-red-500" : ""}`}>
                    <input type="checkbox" checked={form.agreeTerms} onChange={e => setForm(p => ({ ...p, agreeTerms: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-brand" />
                    <span className="text-xs text-gray-600">I agree to the <a href="#" className="text-brand underline">Terms & Conditions</a> and <a href="#" className="text-brand underline">Refund Policy</a> *</span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.agreeData} onChange={e => setForm(p => ({ ...p, agreeData: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-brand" />
                    <span className="text-xs text-gray-600">I consent to NNAWCA sharing my registration details with fellow attendees for networking purposes</span>
                  </label>
                  {errors.agreeTerms && <p className="text-xs text-red-500">{errors.agreeTerms}</p>}
                </div>
              </div>
            )}

            {/* Step: Ticket */}
            {step === "ticket" && (
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Choose Your Ticket</h2>
                  <div className="space-y-3">
                    {ticketTiers.map(tier => (
                      <button key={tier.id} onClick={() => setSelectedTier(tier.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-all ${selectedTier === tier.id ? "border-brand ring-2 ring-brand/20 bg-brand/5" : "border-gray-200 hover:border-gray-300"}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{tier.name}</span>
                              {tier.recommended && <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">RECOMMENDED</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{tier.desc}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-base font-bold text-brand">{tier.priceLabel}</span>
                            <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${selectedTier === tier.id ? "border-brand bg-brand" : "border-gray-300"}`}>
                              {selectedTier === tier.id && <Check className="h-3 w-3 text-white mx-auto mt-0.5" />}
                            </div>
                          </div>
                        </div>
                        <ul className="space-y-1">
                          {tier.perks.map((p, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />{p}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Number of Tickets</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-brand hover:text-brand transition-colors font-bold text-lg">−</button>
                    <span className="text-lg font-bold text-gray-900 w-8 text-center">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(5, q + 1))} className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-brand hover:text-brand transition-colors font-bold text-lg">+</button>
                    <span className="text-xs text-gray-500 ml-2">Max 5 tickets per person</span>
                  </div>
                </div>

                {tier.id === "premium" && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">T-Shirt Size</h3>
                    <div className="flex gap-2 flex-wrap">
                      {["XS", "S", "M", "L", "XL", "XXL"].map(s => (
                        <button key={s} onClick={() => setForm(p => ({ ...p, tShirtSize: s }))}
                          className={`h-9 w-12 rounded-lg border text-sm font-semibold transition-colors ${form.tShirtSize === s ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step: Review */}
            {step === "review" && (
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Review Your Order</h2>
                  <div className="divide-y divide-gray-100 text-sm">
                    {[
                      { label: "Name", value: form.fullName },
                      { label: "Email", value: form.email },
                      { label: "Phone", value: form.phone },
                      { label: "Batch", value: `Batch ${form.batch}` },
                      { label: "Dietary", value: form.dietaryPreference },
                      { label: "Accommodation", value: form.accommodation === "yes" ? "Yes, needed" : "No" },
                      { label: "Ticket Type", value: tier.name },
                      { label: "Quantity", value: `${qty} ticket${qty > 1 ? "s" : ""}` },
                    ].map((row, i) => (
                      <div key={i} className="py-2 flex justify-between">
                        <span className="text-gray-500">{row.label}</span>
                        <span className="font-medium text-gray-800 text-right max-w-[55%]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order summary */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>{tier.name} × {qty}</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>Platform fee (2%)</span>
                      <span>₹{platformFee}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>GST (18%)</span>
                      <span>₹{gst}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-brand">₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> 50% refund up to 7 days before event; no refund after that.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Payment */}
            {step === "payment" && (
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-4">Payment Method</h2>
                  <div className="space-y-2">
                    {([
                      { key: "upi", label: "UPI", icon: <div className="h-5 w-5 rounded bg-purple-100 flex items-center justify-center text-[9px] font-black text-purple-700">UPI</div> },
                      { key: "card", label: "Credit / Debit Card", icon: <CreditCard className="h-5 w-5 text-gray-500" /> },
                      { key: "netbanking", label: "Net Banking", icon: <Building className="h-5 w-5 text-gray-500" /> },
                    ] as const).map(m => (
                      <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                        className={`w-full flex items-center gap-3 rounded-xl border p-3.5 transition-all ${paymentMethod === m.key ? "border-brand ring-2 ring-brand/20 bg-brand/5" : "border-gray-200 hover:border-gray-300"}`}>
                        {m.icon}
                        <span className="text-sm font-medium text-gray-800">{m.label}</span>
                        <div className={`ml-auto h-4 w-4 rounded-full border-2 flex-shrink-0 ${paymentMethod === m.key ? "border-brand bg-brand" : "border-gray-300"}`}>
                          {paymentMethod === m.key && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "upi" && (
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">UPI ID</label>
                      <input
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        placeholder="yourname@upi"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                      />
                    </div>
                  )}

                  {paymentMethod === "card" && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Card Number</label>
                        <input placeholder="1234 5678 9012 3456" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expiry</label>
                          <input placeholder="MM / YY" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">CVV</label>
                          <input placeholder="•••" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order total */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <span>Total Payable</span>
                    <span className="text-brand text-base">₹{total.toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Includes taxes and fees</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
                  <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Secured by Razorpay · PCI DSS compliant
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-4">
              <button
                onClick={next}
                disabled={processing}
                className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Processing Payment…</>
                ) : step === "payment" ? (
                  <>Pay ₹{total.toLocaleString()} <ChevronRight className="h-4 w-4" /></>
                ) : (
                  <>Continue <ChevronRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <span className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </span>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
