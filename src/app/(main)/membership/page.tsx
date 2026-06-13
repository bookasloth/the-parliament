"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CheckCircle, Star, Crown, Award, BadgeCheck, Sparkles,
  ChevronDown, ChevronUp, CreditCard, Shield, Lock, X, Check,
  Users, Calendar, BookOpen, Briefcase, Vote, Trophy, MapPin, MessageCircle,
  Zap, Gift,
} from "lucide-react"

type PaidPlan = "associate" | "premium" | "life"
type Billing = "monthly" | "annual"

const associate = {
  key: "associate" as PaidPlan,
  name: "Associate",
  icon: <Star className="h-5 w-5" />,
  tagline: "For active alumni staying connected",
  monthlyPrice: 99,
  annualPrice: 799,
  features: [
    "Verified Associate badge",
    "Direct messaging with connections (50 / month)",
    "Join private groups",
    "RSVP to events · 10% off paid events",
    "Business directory listing (1 listing)",
    "Advanced alumni search & filters",
    "Monthly alumni digest newsletter",
  ],
  notIncluded: ["Mentorship programme", "Job board posting", "NNAWCA voting rights"],
}

const premium = {
  key: "premium" as PaidPlan,
  name: "Premium",
  icon: <Sparkles className="h-5 w-5" />,
  tagline: "For alumni who give back & grow",
  monthlyPrice: 299,
  annualPrice: 2499,
  features: [
    "Everything in Associate",
    "Unlimited direct messaging",
    "Mentorship programme access",
    "Create & moderate groups",
    "Job board posting (3 / month)",
    "Business directory (3 listings)",
    "Post analytics & engagement insights",
    "Alumni Map opt-in",
    "20% off all paid events",
    "Exclusive Premium badge",
    "Priority customer support",
  ],
  notIncluded: ["NNAWCA voting rights", "Physical magazine"],
}

const life = {
  key: "life" as PaidPlan,
  name: "Life Member",
  icon: <Crown className="h-5 w-5" />,
  tagline: "A lifetime of connection & legacy",
  oneTimePrice: 9999,
  features: [
    "Everything in Premium — forever",
    "Permanent Life Member badge",
    "NNAWCA Hall of Honour entry",
    "Voting rights in NNAWCA elections",
    "Annual physical magazine delivered",
    "Exclusive Life Member meetups",
    "Free priority event registration",
    "Founding member recognition",
    "Dedicated account manager",
  ],
  notIncluded: [],
}

const faqs = [
  { q: "Can I upgrade or downgrade at any time?", a: "Yes, you can upgrade instantly and the new benefits apply immediately. Downgrades take effect at the end of your current billing cycle." },
  { q: "What is the refund policy?", a: "Annual plans are refundable within 7 days of purchase. Monthly plans are non-refundable once the billing cycle starts. Life memberships are non-refundable." },
  { q: "How is the Life Membership different from annual Premium?", a: "Life Membership is a one-time payment that gives you all Premium features permanently, plus exclusive perks like physical magazine delivery, NNAWCA voting rights, and a permanent entry in the Hall of Honour." },
  { q: "Is my payment secure?", a: "All payments are processed through Razorpay, which is PCI DSS Level 1 certified — the highest level of payment security." },
  { q: "What happens to my content if I downgrade?", a: "Your posts, connections, and profile data are always preserved. Access to premium-only features will be restricted, but your content remains intact." },
]

const currentPlan: PaidPlan | "free" = "free"

export default function MembershipPage() {
  const [billing, setBilling] = useState<Billing>("annual")
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleUpgrade(planKey: PaidPlan) {
    setSelectedPlan(planKey)
    setShowConfirm(true)
  }

  const associateSavings = Math.round(((associate.monthlyPrice * 12 - associate.annualPrice) / (associate.monthlyPrice * 12)) * 100)
  const premiumSavings = Math.round(((premium.monthlyPrice * 12 - premium.annualPrice) / (premium.monthlyPrice * 12)) * 100)

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16">

      {/* Confirm modal */}
      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={() => setShowConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            {(() => {
              const plan =
                selectedPlan === "associate" ? associate :
                selectedPlan === "premium" ? premium : life
              const price =
                selectedPlan === "life" ? life.oneTimePrice :
                billing === "annual" ? (plan as typeof associate).annualPrice : (plan as typeof associate).monthlyPrice
              const priceLabel = `₹${price.toLocaleString()}${selectedPlan === "life" ? " one-time" : billing === "annual" ? "/year" : "/month"}`

              const tierBg =
                selectedPlan === "premium" ? "from-[#0c1d3d] to-[#1a3266]" :
                selectedPlan === "life" ? "from-[#7a5a13] to-[#c9a341]" :
                "from-brand-700 to-brand"

              return (
                <>
                  <div className={`mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br ${tierBg} flex items-center justify-center text-white`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Upgrade to {plan.name}</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">{plan.tagline}</p>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center mb-5">
                    <span className="text-2xl font-black text-gray-900">{priceLabel}</span>
                  </div>
                  <Link href="/membership/checkout">
                    <button className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity mb-2 bg-gradient-to-r ${tierBg} hover:opacity-95`}>
                      <CreditCard className="inline h-4 w-4 mr-2" />Continue to Payment
                    </button>
                  </Link>
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

      {/* Hero — navy + gold theme */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#06122a] via-[#0c1d3d] to-[#1a3266] py-14">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 30%, #d4a82c 1.5px, transparent 1.5px), radial-gradient(circle at 82% 18%, #f3d56e 1px, transparent 1px), radial-gradient(circle at 50% 80%, #d4a82c 1.2px, transparent 1.2px)",
            backgroundSize: "120px 120px, 90px 90px, 140px 140px",
          }}
        />
        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d4a82c]/30 bg-[#d4a82c]/10 px-4 py-1.5 text-xs font-semibold text-[#f3d56e] mb-5">
            <Award className="h-3.5 w-3.5" /> NNAWCA Membership
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
            Invest in Your <span className="bg-gradient-to-r from-[#f3d56e] via-[#d4a82c] to-[#f3d56e] bg-clip-text text-transparent">Alumni Journey</span>
          </h1>
          <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto">
            Unlock deeper connections, exclusive events, and lifelong opportunities within the JNV Nagpur alumni family.
          </p>

          {currentPlan !== "free" && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-4 py-1.5 text-xs font-semibold text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" /> Your current plan: {currentPlan}
            </div>
          )}

          {/* Billing toggle */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${billing === "monthly" ? "text-white" : "text-white/50"}`}>Monthly</span>
            <button
              onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
              className={`relative h-7 w-12 rounded-full transition-colors ${billing === "annual" ? "bg-[#d4a82c]" : "bg-white/20"}`}
              aria-label="Toggle billing"
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${billing === "annual" ? "left-6" : "left-1"}`} />
            </button>
            <span className={`text-sm font-medium ${billing === "annual" ? "text-white" : "text-white/50"}`}>
              Annual <span className="text-[#f3d56e] font-bold">Save up to {Math.max(associateSavings, premiumSavings)}%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10 space-y-12">

        {/* 3-column plans grid (Associate · Premium · Life) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* ASSOCIATE */}
          <div className="lg:col-span-4 lg:mt-6">
            <PlanCard
              accent="navy"
              icon={associate.icon}
              name={associate.name}
              tagline={associate.tagline}
              price={billing === "annual" ? associate.annualPrice : associate.monthlyPrice}
              priceSuffix={billing === "annual" ? "/yr" : "/mo"}
              subPrice={billing === "annual" ? `Save ${associateSavings}% vs monthly` : `₹${associate.annualPrice}/yr billed annually`}
              features={associate.features}
              notIncluded={associate.notIncluded}
              ctaLabel="Choose Associate"
              onClick={() => handleUpgrade("associate")}
            />
          </div>

          {/* PREMIUM — recommended, centred, taller */}
          <div className="lg:col-span-4 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#d4a82c] to-[#f3d56e] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#06122a] shadow-lg shadow-[#d4a82c]/30">
                <Sparkles className="h-3.5 w-3.5" /> Recommended
              </span>
            </div>
            <PlanCard
              accent="premium"
              icon={premium.icon}
              name={premium.name}
              tagline={premium.tagline}
              price={billing === "annual" ? premium.annualPrice : premium.monthlyPrice}
              priceSuffix={billing === "annual" ? "/yr" : "/mo"}
              subPrice={billing === "annual" ? `Save ${premiumSavings}% vs monthly` : `₹${premium.annualPrice}/yr billed annually`}
              features={premium.features}
              notIncluded={premium.notIncluded}
              ctaLabel="Get Premium"
              onClick={() => handleUpgrade("premium")}
              recommended
            />
          </div>

          {/* LIFE */}
          <div className="lg:col-span-4 lg:mt-6">
            <PlanCard
              accent="gold"
              icon={life.icon}
              name={life.name}
              tagline={life.tagline}
              price={life.oneTimePrice}
              priceSuffix={null}
              subPrice="One-time payment · Forever"
              features={life.features}
              notIncluded={life.notIncluded}
              ctaLabel="Buy Life Membership"
              onClick={() => handleUpgrade("life")}
            />
          </div>
        </div>

        {/* Feature comparison */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#06122a] to-[#0c1d3d]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#f3d56e]" /> Feature Comparison
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 w-[40%]">Feature</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-brand-700">Associate</th>
                  <th className="text-center px-2 py-3 text-xs font-bold text-[#0c1d3d] bg-[#fef9e7]">Premium</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-[#7a5a13]">Life</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                    <td className="px-6 py-3 text-xs text-gray-700 font-medium">{row.label}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className={`text-center px-2 py-3 ${j === 1 ? "bg-[#fef9e7]/40" : ""}`}>
                        {typeof v === "boolean" ? (
                          v ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-gray-200 mx-auto" />
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

        {/* Why upgrade — navy + gold gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#06122a] via-[#0c1d3d] to-[#1a3266] p-8 text-white">
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#d4a82c]/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#1a3266]/40 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-[#d4a82c]/15 border border-[#d4a82c]/30 px-3 py-1 text-xs font-semibold text-[#f3d56e]">
              <Sparkles className="h-3.5 w-3.5" /> What you get
            </div>
            <h2 className="text-2xl font-extrabold mb-6">Why members upgrade</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {whyUpgrade.map((b, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-[#d4a82c]/30 to-[#d4a82c]/10 border border-[#d4a82c]/30 flex items-center justify-center text-[#f3d56e]">
                    {b.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{b.title}</p>
                    <p className="text-xs text-white/70 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-5 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-gray-800">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-[#d4a82c] flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-1">Join the inner circle of JNV Nagpur alumni</p>
          <p className="text-xs text-gray-500 mb-5">Upgrade today and unlock the full network</p>
          <button onClick={() => handleUpgrade("premium")} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0c1d3d] to-[#1a3266] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#0c1d3d]/20 hover:opacity-95 transition-opacity">
            <Sparkles className="h-4 w-4 text-[#f3d56e]" /> Get Premium
          </button>
          <p className="mt-3 text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" /> Secured by Razorpay · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── PlanCard ─────────────────────────── */

interface PlanCardProps {
  accent: "navy" | "premium" | "gold"
  icon: React.ReactNode
  name: string
  tagline: string
  price: number
  priceSuffix: string | null
  subPrice: string
  features: string[]
  notIncluded: string[]
  ctaLabel: string
  onClick: () => void
  recommended?: boolean
}

function PlanCard({ accent, icon, name, tagline, price, priceSuffix, subPrice, features, notIncluded, ctaLabel, onClick, recommended }: PlanCardProps) {
  const styles = {
    navy: {
      ring: "border-gray-200",
      iconBg: "bg-gradient-to-br from-brand-700 to-brand text-white",
      cta: "bg-gradient-to-r from-brand-700 to-brand text-white hover:opacity-95",
      priceColor: "text-gray-900",
    },
    premium: {
      ring: "border-[#d4a82c] ring-2 ring-[#d4a82c]/40 shadow-2xl shadow-[#d4a82c]/15",
      iconBg: "bg-gradient-to-br from-[#0c1d3d] to-[#1a3266] text-[#f3d56e]",
      cta: "bg-gradient-to-r from-[#0c1d3d] via-[#1a3266] to-[#0c1d3d] text-white hover:opacity-95 ring-2 ring-[#d4a82c]/40",
      priceColor: "text-[#0c1d3d]",
    },
    gold: {
      ring: "border-[#d4a82c]/40",
      iconBg: "bg-gradient-to-br from-[#7a5a13] to-[#d4a82c] text-white",
      cta: "bg-gradient-to-r from-[#7a5a13] to-[#c9a341] text-white hover:opacity-95",
      priceColor: "text-[#7a5a13]",
    },
  }[accent]

  return (
    <div className={`relative h-full bg-white border rounded-2xl overflow-hidden transition-all ${styles.ring} ${recommended ? "lg:scale-[1.02]" : ""}`}>
      {recommended && (
        <>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#d4a82c] via-[#f3d56e] to-[#d4a82c]" />
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#d4a82c]/10 blur-3xl pointer-events-none" />
        </>
      )}
      <div className="p-6 sm:p-7 flex flex-col h-full">
        <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${styles.iconBg} shadow-md`}>
          {icon}
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">{name}</h3>
        <p className="text-sm text-gray-500 mt-1 mb-5">{tagline}</p>

        <div className="mb-5">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-black ${styles.priceColor}`}>₹{price.toLocaleString()}</span>
            {priceSuffix && <span className="text-sm text-gray-500 font-medium">{priceSuffix}</span>}
          </div>
          <div className="mt-1 text-xs text-gray-500">{subPrice}</div>
        </div>

        <button
          onClick={onClick}
          className={`w-full rounded-xl py-3 text-sm font-bold transition-all mb-6 ${styles.cta}`}
        >
          {ctaLabel}
        </button>

        <ul className="space-y-2.5 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <CheckCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${accent === "premium" ? "text-[#d4a82c]" : accent === "gold" ? "text-[#c9a341]" : "text-emerald-500"}`} />
              <span>{f}</span>
            </li>
          ))}
          {notIncluded.map((l, i) => (
            <li key={`n-${i}`} className="flex items-start gap-2.5 text-sm text-gray-400">
              <X className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ─────────────────────────── Data ─────────────────────────── */

const comparisonRows: { label: string; values: (boolean | string)[] }[] = [
  { label: "Profile & Directory access", values: [true, true, true] },
  { label: "Feed, reactions & comments", values: [true, true, true] },
  { label: "Verified badge", values: ["Associate", "Premium", "Life Member"] },
  { label: "Direct messaging", values: ["50 / month", "Unlimited", "Unlimited"] },
  { label: "Private groups", values: [true, true, true] },
  { label: "Create & moderate groups", values: [false, true, true] },
  { label: "Event RSVP & discounts", values: ["10% off", "20% off", "Free priority"] },
  { label: "Business directory listings", values: ["1", "3", "Unlimited"] },
  { label: "Job board posting", values: [false, "3 / month", "Unlimited"] },
  { label: "Mentorship programme", values: [false, true, true] },
  { label: "Alumni Map opt-in", values: [false, true, true] },
  { label: "Post analytics", values: [false, true, true] },
  { label: "NNAWCA voting rights", values: [false, false, true] },
  { label: "Annual physical magazine", values: [false, false, true] },
  { label: "Hall of Honour entry", values: [false, false, true] },
  { label: "Customer support", values: ["Standard", "Priority", "Dedicated"] },
]

const whyUpgrade = [
  { icon: <Users className="h-5 w-5" />, title: "Deeper Connections", desc: "Direct messaging, private groups, contact exchange." },
  { icon: <Briefcase className="h-5 w-5" />, title: "Career Growth", desc: "Mentorship, job board, post analytics, business listings." },
  { icon: <Calendar className="h-5 w-5" />, title: "Event Perks", desc: "Discounts and priority access to reunions and meetups." },
  { icon: <BookOpen className="h-5 w-5" />, title: "Alumni Resources", desc: "Magazine, archives, newsletter, founders' library." },
  { icon: <Vote className="h-5 w-5" />, title: "Voice in NNAWCA", desc: "Vote in elections, shape what the association builds next." },
  { icon: <Gift className="h-5 w-5" />, title: "Member Recognition", desc: "Badges, karma boosts, and Hall of Honour entry." },
  { icon: <MapPin className="h-5 w-5" />, title: "Alumni Map", desc: "Find alumni in your city, opt-in city-level pin." },
  { icon: <MessageCircle className="h-5 w-5" />, title: "Mentor Access", desc: "Senior alumni open to coaching juniors across batches." },
  { icon: <Zap className="h-5 w-5" />, title: "Karma Boost", desc: "Faster karma earn rate on activities and engagement." },
]
