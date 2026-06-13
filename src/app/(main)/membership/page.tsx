"use client"

import { useState } from "react"
import {
  CheckCircle, Star, Crown, Award, BadgeCheck, Sparkles,
  ChevronDown, ChevronUp, CreditCard, Shield, Lock, X, Check,
  Briefcase, Calendar, BookOpen, Vote, MapPin, MessageCircle,
  GraduationCap, FileText, Hand, Trophy, Users, Heart, AlertTriangle,
} from "lucide-react"

type PaidPlan = "associate" | "premium" | "life"

const associate = {
  key: "associate" as PaidPlan,
  name: "Alumni Associate",
  shortName: "Associate",
  icon: <Star className="h-5 w-5" />,
  tagline: "Stay connected, give back, and grow with the network",
  annualPrice: 499,
  cycle: "Annual auto-renew",
  features: [
    "Full alumni directory access",
    "Join online & offline events",
    "Join batch & house groups",
    "Post job openings & referrals",
    "Participate in welfare drives",
    "Access scholarship reports",
    "Event & activity updates",
    "Verified Associate badge",
  ],
  notIncluded: [
    "Apply to be a mentor",
    "List your business",
    "Highlighted profile to students",
  ],
}

const premium = {
  key: "premium" as PaidPlan,
  name: "Alumni Premium",
  shortName: "Premium",
  icon: <Sparkles className="h-5 w-5" />,
  tagline: "Lead, mentor, and shape NNAWCA — for committed alumni",
  annualPrice: 999,
  cycle: "Annual auto-renew",
  features: [
    "Everything in Associate",
    "Apply to be a mentor",
    "List your business in the directory",
    "Eligible for mentorship pairing",
    "Highlighted profile to students",
    "Recognition on NNAWCA website",
    "Recognition at events",
    "Eligible for Seva Cells & leadership roles",
    "Name on Scholarship Supporters Wall",
    "Early access to limited-seat events",
    "Yearly Certificate of Contribution",
  ],
  notIncluded: [],
}

const life = {
  key: "life" as PaidPlan,
  name: "Life Member",
  shortName: "Life",
  icon: <Crown className="h-5 w-5" />,
  tagline: "A lifetime contribution — never renews, never lapses",
  oneTimePrice: 9999,
  cycle: "Lifetime · one-time payment",
  features: [
    "Everything in Premium — forever",
    "Permanent Life Member badge",
    "Never renews · never expires",
    "Eligible for NNAWCA Committee invitation",
    "Founding contributor recognition",
    "All Premium recognition perks, in perpetuity",
    "Lifetime Certificate of Contribution",
    "Priority support",
  ],
  notIncluded: [],
}

const faqs = [
  {
    q: "Can I upgrade from Associate to Premium?",
    a: "Yes — pay the ₹500 difference and your benefits upgrade instantly. Your existing end date is preserved (you don't restart the clock).",
  },
  {
    q: "What happens when my subscription expires?",
    a: "You enter a 30-day grace period during which benefits remain active. If you don't renew, your account reverts to Free Member — your posts, connections, and profile stay intact, only premium features are restricted.",
  },
  {
    q: "How is Life Membership different from annual Premium?",
    a: "Life Membership is a one-time ₹9,999 payment. You get every Premium benefit, permanently — no annual renewal, no expiry. Life Members are also the only members eligible to be invited onto the NNAWCA Committee.",
  },
  {
    q: "Are contributions refundable?",
    a: "No. All NNAWCA membership payments are non-refundable contributions to the association. You'll see and acknowledge this on the checkout page before payment, and it's also printed on every invoice.",
  },
  {
    q: "Who can vote in NNAWCA decisions?",
    a: "Any verified member who has been active for at least 30 days can vote — regardless of paid tier. Voting eligibility is snapshotted when a poll opens, so mid-poll tier changes don't affect the voter list.",
  },
  {
    q: "How does the Committee invitation work?",
    a: "The Committee is invite-only and restricted to Life Members. Only Super-Admins can extend invites, and tenure is 3 years by default. You can't purchase Committee membership — it's a recognition of long-term contribution.",
  },
  {
    q: "Is my payment secure?",
    a: "All payments are processed via Razorpay, which is PCI DSS Level 1 certified. We never see or store your card details.",
  },
  {
    q: "What happens to my content if I downgrade?",
    a: "Posts, comments, connections, and your profile data are always preserved. Only premium-only features (mentorship, business listing, highlighted profile) get restricted.",
  },
]

const currentPlan: PaidPlan | "free" = "free"

export default function MembershipPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [acknowledgedNonRefundable, setAcknowledgedNonRefundable] = useState(false)

  function handleUpgrade(planKey: PaidPlan) {
    setSelectedPlan(planKey)
    setAcknowledgedNonRefundable(false)
    setShowConfirm(true)
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16">

      {/* Confirm modal — non-refundable disclosure per MEMBERSHIP_PLAN §7a */}
      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button onClick={() => setShowConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close"><X className="h-5 w-5" /></button>
            {(() => {
              const plan =
                selectedPlan === "associate" ? associate :
                selectedPlan === "premium" ? premium : life
              const price = selectedPlan === "life" ? life.oneTimePrice : (plan as typeof associate).annualPrice
              const priceLabel = `₹${price.toLocaleString()}${selectedPlan === "life" ? " one-time" : " / year"}`
              const tierBg =
                selectedPlan === "premium" ? "from-[#0c1d3d] to-[#1a3266]" :
                selectedPlan === "life" ? "from-[#7a5a13] to-[#c9a341]" :
                "from-brand-700 to-brand"

              return (
                <>
                  <div className={`mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br ${tierBg} flex items-center justify-center text-white shadow-lg`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Join as {plan.shortName}</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">{plan.tagline}</p>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center mb-5">
                    <span className="text-2xl font-black text-gray-900">{priceLabel}</span>
                    <div className="text-xs text-gray-500 mt-1">{plan.cycle}</div>
                  </div>

                  <label className="flex items-start gap-3 mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledgedNonRefundable}
                      onChange={(e) => setAcknowledgedNonRefundable(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-400 text-[#0c1d3d] focus:ring-[#d4a82c]"
                    />
                    <span className="text-xs text-amber-900 leading-relaxed">
                      <strong>I understand this is a non-refundable contribution to NNAWCA.</strong> I have read the membership terms.
                    </span>
                  </label>

                  <button
                    disabled={!acknowledgedNonRefundable}
                    onClick={() => { window.location.href = "/membership/checkout" }}
                    className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity mb-2 bg-gradient-to-r ${tierBg} ${acknowledgedNonRefundable ? "hover:opacity-95" : "opacity-40 cursor-not-allowed"}`}
                  >
                    <CreditCard className="inline h-4 w-4 mr-2" />Continue to Payment
                  </button>
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

      {/* Hero — navy + gold */}
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
            Contribute to <span className="bg-gradient-to-r from-[#f3d56e] via-[#d4a82c] to-[#f3d56e] bg-clip-text text-transparent">NNAWCA</span>
          </h1>
          <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto">
            Membership is a contribution to the Nagpur Navodaya Alumni Welfare and Charitable Association — funding scholarships, events, mentorship, and the platform itself.
          </p>

          {currentPlan === "free" ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80">
              <Heart className="h-3.5 w-3.5 text-[#f3d56e]" /> You're a Free Member · upgrade to contribute
            </div>
          ) : (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-4 py-1.5 text-xs font-semibold text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" /> Your current plan: {currentPlan}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10 space-y-12">

        {/* 3-column plans grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* ASSOCIATE */}
          <div className="lg:col-span-4 lg:mt-6">
            <PlanCard
              accent="navy"
              icon={associate.icon}
              name={associate.name}
              tagline={associate.tagline}
              price={associate.annualPrice}
              priceSuffix="/year"
              subPrice={associate.cycle}
              features={associate.features}
              notIncluded={associate.notIncluded}
              ctaLabel="Become an Associate"
              onClick={() => handleUpgrade("associate")}
            />
          </div>

          {/* PREMIUM — recommended */}
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
              price={premium.annualPrice}
              priceSuffix="/year"
              subPrice={premium.cycle}
              features={premium.features}
              notIncluded={premium.notIncluded}
              ctaLabel="Become Premium"
              onClick={() => handleUpgrade("premium")}
              recommended
              upgradeNote="Already an Associate? Upgrade for just ₹500 more — keeps your renewal date."
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
              subPrice={life.cycle}
              features={life.features}
              notIncluded={life.notIncluded}
              ctaLabel="Become a Life Member"
              onClick={() => handleUpgrade("life")}
            />
          </div>
        </div>

        {/* Non-refundable banner */}
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-900">
            <strong>All NNAWCA contributions are non-refundable.</strong> Membership payments fund welfare drives, scholarships, events, and the platform — there is no refund window or self-service cancellation refund. You'll acknowledge this at checkout.
          </p>
        </div>

        {/* Feature comparison — canonical matrix from MEMBERSHIP_PLAN §1b */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#06122a] to-[#0c1d3d]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#f3d56e]" /> Benefit Matrix
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 w-[40%]">Benefit</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-gray-500">Free</th>
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
                      <td key={j} className={`text-center px-2 py-3 ${j === 2 ? "bg-[#fef9e7]/40" : ""}`}>
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
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 text-xs text-gray-500 flex items-center gap-2">
            <Vote className="h-3.5 w-3.5 text-gray-400" />
            Voting in NNAWCA decisions is open to <strong className="text-gray-700">any verified member with 30+ days active</strong>, regardless of paid tier.
          </div>
        </div>

        {/* Where your contribution goes */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#06122a] via-[#0c1d3d] to-[#1a3266] p-8 text-white">
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#d4a82c]/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#1a3266]/40 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-[#d4a82c]/15 border border-[#d4a82c]/30 px-3 py-1 text-xs font-semibold text-[#f3d56e]">
              <Sparkles className="h-3.5 w-3.5" /> Where your contribution goes
            </div>
            <h2 className="text-2xl font-extrabold mb-6">A contribution, not a subscription</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {whereItGoes.map((b, i) => (
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

        {/* Committee callout */}
        <div className="rounded-2xl border border-[#d4a82c]/40 bg-gradient-to-r from-[#fef9e7] via-white to-[#fef9e7] p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7a5a13] to-[#c9a341] text-white flex items-center justify-center shadow-md">
              <Hand className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-extrabold text-[#0c1d3d]">NNAWCA Committee</h3>
                <span className="rounded-full bg-[#0c1d3d] text-[#f3d56e] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">Invite-only</span>
              </div>
              <p className="text-sm text-gray-700">
                The Committee is the governance body of NNAWCA. It's not for sale — invitations are extended by Super-Admins exclusively to <strong>Life Members</strong>, with a default 3-year tenure. Becoming a Life Member is the first step toward being eligible.
              </p>
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
          <p className="text-sm font-semibold text-gray-800 mb-1">Join the contributors of NNAWCA</p>
          <p className="text-xs text-gray-500 mb-5">Every contribution funds scholarships, events, and the platform</p>
          <button onClick={() => handleUpgrade("premium")} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0c1d3d] to-[#1a3266] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#0c1d3d]/20 hover:opacity-95 transition-opacity">
            <Sparkles className="h-4 w-4 text-[#f3d56e]" /> Become Premium
          </button>
          <p className="mt-3 text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" /> Secured by Razorpay · Non-refundable contribution
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
  upgradeNote?: string
}

function PlanCard({ accent, icon, name, tagline, price, priceSuffix, subPrice, features, notIncluded, ctaLabel, onClick, recommended, upgradeNote }: PlanCardProps) {
  const styles = {
    navy: {
      ring: "border-gray-200",
      iconBg: "bg-gradient-to-br from-brand-700 to-brand text-white",
      cta: "bg-gradient-to-r from-brand-700 to-brand text-white hover:opacity-95",
      priceColor: "text-gray-900",
      checkColor: "text-emerald-500",
    },
    premium: {
      ring: "border-[#d4a82c] ring-2 ring-[#d4a82c]/40 shadow-2xl shadow-[#d4a82c]/15",
      iconBg: "bg-gradient-to-br from-[#0c1d3d] to-[#1a3266] text-[#f3d56e]",
      cta: "bg-gradient-to-r from-[#0c1d3d] via-[#1a3266] to-[#0c1d3d] text-white hover:opacity-95 ring-2 ring-[#d4a82c]/40",
      priceColor: "text-[#0c1d3d]",
      checkColor: "text-[#d4a82c]",
    },
    gold: {
      ring: "border-[#d4a82c]/40",
      iconBg: "bg-gradient-to-br from-[#7a5a13] to-[#d4a82c] text-white",
      cta: "bg-gradient-to-r from-[#7a5a13] to-[#c9a341] text-white hover:opacity-95",
      priceColor: "text-[#7a5a13]",
      checkColor: "text-[#c9a341]",
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
          className={`w-full rounded-xl py-3 text-sm font-bold transition-all mb-3 ${styles.cta}`}
        >
          {ctaLabel}
        </button>

        {upgradeNote && (
          <div className="mb-4 rounded-lg bg-amber-50/60 border border-amber-200/70 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
            {upgradeNote}
          </div>
        )}

        <ul className="space-y-2.5 flex-1 mt-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <CheckCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${styles.checkColor}`} />
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

/* ─── Canonical benefit matrix per MEMBERSHIP_PLAN.md §1b ─── */

const comparisonRows: { label: string; values: (boolean | string)[] }[] = [
  { label: "View full alumni directory", values: [true, true, true, true] },
  { label: "Join online & offline events", values: [true, true, true, true] },
  { label: "Join batch & house groups", values: [true, true, true, true] },
  { label: "Participate in welfare drives", values: [true, true, true, true] },
  { label: "Access scholarship reports", values: [true, true, true, true] },
  { label: "Event & activity updates", values: [true, true, true, true] },
  { label: "Voting rights (verified + 30 days)", values: [true, true, true, true] },
  { label: "Post job openings & referrals", values: [false, true, true, true] },
  { label: "Apply to be a mentor", values: [false, false, true, true] },
  { label: "List own business in directory", values: [false, false, true, true] },
  { label: "Eligible for mentorship pairing", values: [false, false, true, true] },
  { label: "Profile visibility to students", values: ["Normal", "Normal", "Highlighted", "Highlighted"] },
  { label: "Recognition on NNAWCA website", values: [false, false, true, true] },
  { label: "Recognition at events", values: [false, false, true, true] },
  { label: "Eligible for Seva Cells / leadership", values: [false, false, true, true] },
  { label: "Name on Scholarship Supporters Wall", values: [false, false, true, true] },
  { label: "Early access to limited-seat events", values: [false, false, true, true] },
  { label: "Yearly Certificate of Contribution", values: [false, false, true, true] },
  { label: "Eligible for Committee invitation", values: [false, false, false, true] },
  { label: "Membership cycle", values: ["Permanent", "₹499/yr", "₹999/yr", "Lifetime"] },
]

const whereItGoes = [
  { icon: <GraduationCap className="h-5 w-5" />, title: "Scholarships", desc: "Funds for current JNV Nagpur students to pursue higher education." },
  { icon: <Heart className="h-5 w-5" />, title: "Welfare Drives", desc: "Support for alumni and the JNV community during crises." },
  { icon: <Calendar className="h-5 w-5" />, title: "Events & Reunions", desc: "Funding reunions, founders' day, batch gatherings, professional meetups." },
  { icon: <Users className="h-5 w-5" />, title: "Mentorship Programme", desc: "Connecting alumni with juniors for guidance, internships, and careers." },
  { icon: <Briefcase className="h-5 w-5" />, title: "Career Support", desc: "Job board, referrals, business directory, hiring pipelines for alumni." },
  { icon: <BookOpen className="h-5 w-5" />, title: "Knowledge & Archives", desc: "Yearbooks, magazines, the digital history of JNV Nagpur." },
  { icon: <MapPin className="h-5 w-5" />, title: "Alumni Map", desc: "City-level network — find alumni anywhere in the world." },
  { icon: <MessageCircle className="h-5 w-5" />, title: "Platform & Tools", desc: "Hosting, maintenance, and continued development of The Parliament." },
  { icon: <FileText className="h-5 w-5" />, title: "Governance", desc: "Annual reports, audits, AGMs, transparency for every contribution." },
]
