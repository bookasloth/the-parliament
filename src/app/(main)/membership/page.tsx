"use client"

import { useState } from "react"
import {
  Home, Users, Calendar, Menu, Plus, X, CheckCircle, Star,
  Shield, Zap, Crown, Award, ChevronRight, ChevronDown, ChevronUp,
  ArrowLeft, CreditCard, BadgeCheck, Clock, Infinity as InfinityIcon,
  Heart, MessageCircle, BookOpen, Gift, Headphones, Percent,
  Check, AlertCircle, ExternalLink, Lock,
} from "lucide-react"

type Plan = "free" | "associate" | "premium" | "life"
type Billing = "monthly" | "annual"

const plans = [
  {
    key: "free" as Plan,
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    badge: null,
    color: "gray",
    icon: <Heart className="h-5 w-5" />,
    tagline: "For everyone in the alumni family",
    features: [
      "Profile & basic directory access",
      "View & react to feed posts",
      "Join public groups",
      "Attend free events",
      "Basic alumni search",
    ],
    limitations: [
      "No direct messaging",
      "No premium events",
      "No business listings",
    ],
  },
  {
    key: "associate" as Plan,
    name: "Associate",
    monthlyPrice: 99,
    annualPrice: 799,
    badge: "Popular",
    color: "amber",
    icon: <Star className="h-5 w-5" />,
    tagline: "For active alumni staying connected",
    features: [
      "Everything in Free",
      "Direct messaging (up to 50/mo)",
      "Join private groups",
      "Attend paid events at 10% off",
      "Business directory listing (1 listing)",
      "Advanced alumni search + filters",
      "Activity badge & profile highlight",
      "Monthly alumni digest newsletter",
    ],
    limitations: [
      "No mentorship access",
      "No job board posting",
    ],
  },
  {
    key: "premium" as Plan,
    name: "Premium",
    monthlyPrice: 299,
    annualPrice: 2499,
    badge: "Best Value",
    color: "blue",
    icon: <Shield className="h-5 w-5" />,
    tagline: "For alumni who give back & grow",
    features: [
      "Everything in Associate",
      "Unlimited direct messaging",
      "Create & moderate groups",
      "20% off all paid events",
      "Job board posting (3 posts/mo)",
      "Mentorship programme access",
      "Business directory (3 listings)",
      "Analytics on your posts",
      "Priority customer support",
      "Exclusive premium badge",
      "Early access to new features",
    ],
    limitations: [],
  },
  {
    key: "life" as Plan,
    name: "Life Member",
    monthlyPrice: 0,
    annualPrice: 9999,
    badge: "One-time",
    color: "yellow",
    icon: <Crown className="h-5 w-5" />,
    tagline: "A lifetime of connection & legacy",
    isOneTime: true,
    features: [
      "Everything in Premium — forever",
      "Permanent verified Life Member badge",
      "Founding member recognition",
      "Annual physical magazine delivery",
      "Name in NNAWCA Hall of Honour",
      "Exclusive life member meetups",
      "Free priority event registration",
      "Dedicated account manager",
      "Vote in NNAWCA elections",
    ],
    limitations: [],
  },
]

const faqs = [
  {
    q: "Can I upgrade or downgrade at any time?",
    a: "Yes, you can upgrade instantly and the new benefits apply immediately. Downgrades take effect at the end of your current billing cycle.",
  },
  {
    q: "What is the refund policy?",
    a: "Annual plans are refundable within 7 days of purchase. Monthly plans are non-refundable once the billing cycle starts. Life memberships are non-refundable.",
  },
  {
    q: "How is the Life Membership different from annual Premium?",
    a: "Life Membership is a one-time payment that gives you all Premium features permanently, plus exclusive perks like physical magazine delivery, NNAWCA voting rights, and a permanent entry in the Hall of Honour.",
  },
  {
    q: "Is my payment secure?",
    a: "All payments are processed through Razorpay, which is PCI DSS Level 1 certified — the highest level of payment security.",
  },
  {
    q: "Do students get a discount?",
    a: "Yes! Current JNV students and recent graduates (within 2 years) get 50% off Associate and Premium plans. Contact us with proof of enrollment.",
  },
  {
    q: "What happens to my content if I downgrade?",
    a: "Your posts, connections, and profile data are always preserved. Access to premium-only features will be restricted, but your content remains intact.",
  },
]

const testimonials = [
  { name: "Neha Gupta", role: "IAS Officer · Batch 2008", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face", plan: "premium", text: "The Parliament's Premium membership connected me with mentors who shaped my UPSC journey. Worth every rupee." },
  { name: "Dr. Amit Verma", role: "Cardiologist · Batch 2005", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face", plan: "life", text: "Bought the Life Membership immediately. This platform will outlast us all — glad to be a founding member." },
  { name: "Priya Sharma", role: "Software Engineer · Batch 2010", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", plan: "associate", text: "Associate plan is perfect for me. The events discount alone paid for the annual subscription!" },
]

const currentPlan: Plan = "free"

const planColors: Record<string, { ring: string; bg: string; text: string; badge: string; button: string }> = {
  gray: { ring: "ring-gray-200", bg: "bg-gray-50", text: "text-gray-700", badge: "bg-gray-100 text-gray-600", button: "bg-gray-800 hover:bg-gray-900" },
  amber: { ring: "ring-amber-400", bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", button: "bg-amber-500 hover:bg-amber-600" },
  blue: { ring: "ring-brand", bg: "bg-brand/5", text: "text-brand", badge: "bg-brand/10 text-brand", button: "bg-brand hover:bg-brand-600" },
  yellow: { ring: "ring-yellow-400", bg: "bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700", button: "bg-yellow-500 hover:bg-yellow-600" },
}

export default function MembershipPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [billing, setBilling] = useState<Billing>("annual")
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const annualSavings = (plan: typeof plans[0]) => {
    if (plan.key === "life" || plan.key === "free") return null
    const monthly12 = plan.monthlyPrice * 12
    const annual = plan.annualPrice
    return Math.round(((monthly12 - annual) / monthly12) * 100)
  }

  function handleUpgrade(planKey: Plan) {
    setSelectedPlan(planKey)
    setShowConfirm(true)
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      {/* Confirm modal */}
      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={() => setShowConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            {(() => {
              const plan = plans.find(p => p.key === selectedPlan)!
              const price = plan.isOneTime ? plan.annualPrice : billing === "annual" ? plan.annualPrice : plan.monthlyPrice
              const priceLabel = price === 0 ? "Free" : `₹${price.toLocaleString()}${plan.isOneTime ? " one-time" : billing === "annual" ? "/year" : "/month"}`
              return (
                <>
                  <div className={`mx-auto mb-4 h-14 w-14 rounded-2xl ${planColors[plan.color].bg} flex items-center justify-center ${planColors[plan.color].text}`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Upgrade to {plan.name}</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">{plan.tagline}</p>
                  <div className={`rounded-xl ${planColors[plan.color].bg} border ${planColors[plan.color].ring.replace("ring-", "border-")} p-3 text-center mb-5`}>
                    <span className={`text-2xl font-black ${planColors[plan.color].text}`}>{priceLabel}</span>
                  </div>
                  <a href="/membership/checkout">
                    <button className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-colors mb-2 ${planColors[plan.color].button}`}>
                      <CreditCard className="inline h-4 w-4 mr-2" />Continue to Payment
                    </button>
                  </a>
                  <button onClick={() => setShowConfirm(false)} className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <p className="mt-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3 text-green-500" /> Secured by Razorpay
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center gap-2 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
          <a href="/settings" className="p-1.5 rounded-lg text-gray-500 hover:text-brand hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></a>
          <span className="text-sm font-semibold text-gray-900">Membership Plans</span>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1628] to-brand py-10 px-4 sm:px-6 text-center">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/90 mb-4">
            <Award className="h-3.5 w-3.5 text-amber-400" /> NNAWCA Membership Plans
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Invest in Your Alumni Journey</h1>
          <p className="text-sm text-white/70 max-w-md mx-auto">
            Unlock deeper connections, exclusive events, and career opportunities within the JNV Nagpur alumni family.
          </p>

          {/* Current plan */}
          {currentPlan !== "free" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500/20 border border-green-400/30 px-4 py-1.5 text-xs font-semibold text-green-300">
              <BadgeCheck className="h-3.5 w-3.5" /> Your current plan: {plans.find(p => p.key === currentPlan)?.name}
            </div>
          )}

          {/* Billing toggle */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${billing === "monthly" ? "text-white" : "text-white/50"}`}>Monthly</span>
            <button
              onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
              className={`relative h-7 w-12 rounded-full transition-colors ${billing === "annual" ? "bg-brand" : "bg-white/20"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${billing === "annual" ? "left-6" : "left-1"}`} />
            </button>
            <span className={`text-sm font-medium ${billing === "annual" ? "text-white" : "text-white/50"}`}>
              Annual <span className="text-green-400 font-bold">Save up to 33%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-8">

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => {
            const colors = planColors[plan.color]
            const price = plan.isOneTime ? plan.annualPrice : billing === "annual" ? plan.annualPrice : plan.monthlyPrice
            const savings = annualSavings(plan)
            const isCurrent = plan.key === currentPlan
            const isPopular = plan.badge === "Popular" || plan.badge === "Best Value"

            return (
              <div
                key={plan.key}
                className={`relative bg-white border rounded-2xl overflow-hidden transition-all ${isPopular ? `ring-2 ${colors.ring} border-transparent shadow-lg` : "border-gray-200"}`}
              >
                {plan.badge && (
                  <div className={`absolute top-0 inset-x-0 h-1 ${plan.color === "amber" ? "bg-amber-400" : plan.color === "blue" ? "bg-brand" : plan.color === "yellow" ? "bg-yellow-400" : "bg-gray-300"}`} />
                )}
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}>
                        {plan.icon}
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>
                    </div>
                    {plan.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold flex-shrink-0 ml-2 ${colors.badge}`}>{plan.badge}</span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    {plan.key === "free" ? (
                      <div className="text-2xl font-black text-gray-900">Free</div>
                    ) : plan.isOneTime ? (
                      <>
                        <div className="text-2xl font-black text-gray-900">₹{plan.annualPrice.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">one-time payment</div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-gray-900">₹{price}</span>
                          <span className="text-xs text-gray-500">/{billing === "annual" ? "yr" : "mo"}</span>
                        </div>
                        {billing === "annual" && savings && (
                          <div className="mt-0.5 text-xs text-green-600 font-semibold">Save {savings}% vs monthly</div>
                        )}
                        {billing === "monthly" && (
                          <div className="mt-0.5 text-xs text-gray-400">₹{plan.annualPrice}/yr if billed annually</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* CTA */}
                  {isCurrent ? (
                    <button disabled className="w-full rounded-xl bg-gray-100 py-2.5 text-xs font-bold text-gray-500 cursor-not-allowed mb-4 flex items-center justify-center gap-1">
                      <BadgeCheck className="h-4 w-4 text-green-500" /> Current Plan
                    </button>
                  ) : plan.key === "free" ? (
                    <button disabled className="w-full rounded-xl bg-gray-100 py-2.5 text-xs font-bold text-gray-400 cursor-not-allowed mb-4">
                      Always Free
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      className={`w-full rounded-xl py-2.5 text-xs font-bold text-white transition-colors mb-4 ${colors.button}`}
                    >
                      {plan.isOneTime ? "Buy Life Membership" : `Upgrade to ${plan.name}`}
                    </button>
                  )}

                  {/* Features */}
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                    {plan.limitations.map((l, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <X className="h-3.5 w-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature comparison table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Feature Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-gray-600 w-[40%]">Feature</th>
                  {plans.map(p => (
                    <th key={p.key} className="text-center px-2 py-3 text-xs font-semibold text-gray-700 w-[15%]">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Profile & Directory", values: [true, true, true, true] },
                  { label: "Feed & Reactions", values: [true, true, true, true] },
                  { label: "Direct Messaging", values: ["—", "50/mo", "Unlimited", "Unlimited"] },
                  { label: "Private Groups", values: [false, true, true, true] },
                  { label: "Create Groups", values: [false, false, true, true] },
                  { label: "Event Discount", values: ["—", "10%", "20%", "Free priority"] },
                  { label: "Business Listings", values: ["—", "1", "3", "Unlimited"] },
                  { label: "Job Board Posting", values: [false, false, "3/mo", "Unlimited"] },
                  { label: "Mentorship Access", values: [false, false, true, true] },
                  { label: "Post Analytics", values: [false, false, true, true] },
                  { label: "Verified Badge", values: [false, "Associate", "Premium", "Life Member"] },
                  { label: "NNAWCA Voting Rights", values: [false, false, false, true] },
                  { label: "Physical Magazine", values: [false, false, false, true] },
                  { label: "Priority Support", values: [false, false, true, "Dedicated"] },
                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 sm:px-6 py-3 text-xs text-gray-600 font-medium">{row.label}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className="text-center px-2 py-3">
                        {typeof v === "boolean" ? (
                          v ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-gray-200 mx-auto" />
                        ) : (
                          <span className="text-xs text-gray-700">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Testimonials */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">What Members Say</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-700 italic mb-4">"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <img src={t.avatar} alt={t.name} className="h-9 w-9 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                    t.plan === "life" ? "bg-yellow-100 text-yellow-700" : t.plan === "premium" ? "bg-brand/10 text-brand" : "bg-amber-100 text-amber-700"
                  }`}>{t.plan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Perks / benefits visual */}
        <div className="bg-gradient-to-r from-brand to-brand-700 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-bold mb-4">Why Upgrade?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: <Users className="h-5 w-5" />, title: "Deeper Connections", desc: "Unlock messaging and private groups" },
              { icon: <Zap className="h-5 w-5" />, title: "Career Growth", desc: "Job board, mentorship, and business listings" },
              { icon: <Calendar className="h-5 w-5" />, title: "Event Perks", desc: "Discounts on exclusive reunions and events" },
              { icon: <BookOpen className="h-5 w-5" />, title: "Alumni Resources", desc: "Yearbooks, magazines, and archive access" },
              { icon: <Gift className="h-5 w-5" />, title: "Member Rewards", desc: "Badges, karma boosts, and recognition" },
              { icon: <Headphones className="h-5 w-5" />, title: "Priority Support", desc: "Dedicated help when you need it most" },
            ].map((b, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">{b.icon}</div>
                <div>
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="text-xs text-white/70">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-gray-800">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-brand flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="flex justify-center gap-2 mb-3">
            <div className="flex -space-x-2">
              {["https://images.unsplash.com/photo-1580489944761-15a19d654956?w=60&h=60&fit=crop&crop=face",
                "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&crop=face",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face",
              ].map((src, i) => (
                <img key={i} src={src} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Join 1,200+ paid members</p>
          <p className="text-xs text-gray-500 mb-4">Be part of the inner circle of JNV Nagpur alumni</p>
          <button onClick={() => handleUpgrade("premium")} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition-colors">
            Get Premium <ChevronRight className="inline h-4 w-4" />
          </button>
          <p className="mt-2 text-xs text-gray-400 flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" /> Secured by Razorpay · Cancel anytime
          </p>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <span className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </span>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
