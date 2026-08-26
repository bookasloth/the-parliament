"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Check, ChevronDown, ArrowRight, Sparkles, Crown, Star, Minus,
  Rss, Briefcase, Video, Images, Gamepad2, BadgeCheck,
  ShieldOff, Store, CalendarClock, Award, MapPin, Users,
  GraduationCap, HeartHandshake, Server, ShieldCheck, Landmark,
  Infinity as InfinityIcon,
} from "lucide-react"
import {
  PLANS, ASSOCIATE_TO_PREMIUM_DELTA_INR,
  TIER_GALLERY_BYTES, type PlanCode,
} from "@/config/membership"
import { TIER_CALL_LIMITS, STUDENT_PASS } from "@/config/calls"

export type TierKey = "associate" | "premium" | "life"

type Feature = { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }

interface TierConfig {
  key: TierKey
  name: string
  tagline: string
  blurb: string
  priceInr: number
  per: string
  perMonthNote?: string
  anchor?: { label: string; href: string }
  badge?: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  accentInk: string
  accentSoft: string
  onAccent: string
  addsLabel: string
  builtOn?: string
  features: Feature[]
  cta: string
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`
const perMonth = (yearly: number) => `≈ ${rupees(Math.round(yearly / 12))}/month`

const TIERS: Record<TierKey, TierConfig> = {
  associate: {
    key: "associate",
    name: "Alumni Associate",
    tagline: "The whole network — without the limits.",
    blurb: "Post jobs and referrals, call alumni for up to 30 minutes, store your reunion photos, and browse a fuller feed with fewer ads. The everyday membership most alumni pick.",
    priceInr: PLANS.associate.priceInr,
    per: "/year",
    perMonthNote: perMonth(PLANS.associate.priceInr),
    anchor: { label: "Upgrade to Premium anytime for just the ₹" + ASSOCIATE_TO_PREMIUM_DELTA_INR + " difference", href: "/membership/premium" },
    badge: "Most chosen",
    icon: Star,
    accent: "#009ae4",
    accentInk: "#007bb8",
    accentSoft: "#e0f4ff",
    onAccent: "#ffffff",
    addsLabel: "What Associate adds",
    features: [
      { icon: Rss, title: "Full, uncapped feed", desc: "The whole alumni feed — with fewer ads than the free tier." },
      { icon: Briefcase, title: "Post jobs & referrals", desc: "Hire from the network, and get hired by it." },
      { icon: Video, title: "Included video calling", desc: "Up to 30 minutes per call — no per-call charge." },
      { icon: Images, title: "1 GB gallery storage", desc: "Share reunion and batch memories." },
      { icon: Gamepad2, title: "Daily-game archive", desc: "Play past puzzles, not just today's." },
      { icon: BadgeCheck, title: "Verified Associate badge", desc: "Shown on your profile across the platform." },
    ],
    cta: "Get Associate",
  },
  premium: {
    key: "premium",
    name: "Alumni Premium",
    tagline: "Zero ads. A profile that stands out. Your business in front of everyone.",
    blurb: "The best everyday experience on the network — an ad-free feed, a highlighted profile, your own business listing, longer calls, and five times the storage.",
    priceInr: PLANS.premium.priceInr,
    per: "/year",
    perMonthNote: perMonth(PLANS.premium.priceInr),
    anchor: { label: "Or make it permanent — Life is ₹9,999 once, and never renews", href: "/membership/life" },
    badge: "Best experience",
    icon: Sparkles,
    accent: "#22a45d",
    accentInk: "#177544",
    accentSoft: "#e3f6ec",
    onAccent: "#ffffff",
    addsLabel: "Exclusive to Premium",
    builtOn: "Everything in Associate, plus:",
    features: [
      { icon: ShieldOff, title: "A completely ad-free feed", desc: "No in-stream ads, no sidebar ads. Just the network." },
      { icon: Sparkles, title: "Highlighted profile", desc: "Your card stands out in the directory with a Premium badge." },
      { icon: Store, title: "List your business", desc: "Put your business in front of the whole alumni network." },
      { icon: Video, title: "More video calling", desc: "Longer calls — up to 60 minutes each." },
      { icon: Images, title: "5 GB gallery storage", desc: "Five times the space to share and archive photos." },
      { icon: CalendarClock, title: "Earlier event invitations", desc: "Hear about limited-seat events before Associates do." },
      { icon: Award, title: "Yearly Certificate of Contribution", desc: "A downloadable certificate, every year." },
    ],
    cta: "Get Premium",
  },
  life: {
    key: "life",
    name: "Life Member",
    tagline: "Pay once. Every benefit, for life.",
    blurb: "One payment and you never renew again — every Premium benefit permanently, the longest calls, the most storage, and a seat you can be invited to on the NNAWCA Committee.",
    priceInr: PLANS.life.priceInr,
    per: "· one-time",
    perMonthNote: "Never renews — vs ₹999 every year for Premium",
    anchor: { label: "Not ready for lifetime? Premium is ₹999/year", href: "/membership/premium" },
    badge: "Never renews",
    icon: Crown,
    accent: "#f2a900",
    accentInk: "#a76a00",
    accentSoft: "#fdf3d6",
    onAccent: "#3a2c00",
    addsLabel: "Exclusive to Life",
    builtOn: "Everything in Premium — for life, plus:",
    features: [
      { icon: InfinityIcon, title: "Never renews, never expires", desc: "Pay once. Your benefits never lapse." },
      { icon: Crown, title: "Permanent Life Member badge", desc: "A distinction that stays with you." },
      { icon: Video, title: "The most video calling", desc: "The longest calls — up to 90 minutes each." },
      { icon: Images, title: "10 GB gallery storage", desc: "The most space of any tier." },
      { icon: Users, title: "Eligible for the Committee", desc: "Only Life Members can be invited onto the NNAWCA Committee." },
      { icon: Award, title: "Lifetime Certificate of Contribution", desc: "Recognition of a permanent contribution." },
    ],
    cta: "Become a Life Member",
  },
}

/* ── Free vs paid comparison (all values are the real, enforced entitlements) ── */
const gb = (bytes: number) => {
  const g = bytes / (1024 ** 3)
  return g >= 1 ? `${g % 1 === 0 ? g : g.toFixed(0)} GB` : `${Math.round(bytes / (1024 ** 2))} MB`
}
const callCell = (k: PlanCode) => {
  const l = TIER_CALL_LIMITS[k]
  return l ? `${l.perCallMin} min/call` : `Pay-per-pass`
}
type Cell = boolean | string
const COMPARE: { label: string; cells: [Cell, Cell, Cell, Cell] }[] = [
  { label: "Directory, events, groups & messaging", cells: [true, true, true, true] },
  { label: "Voting rights (verified, 30+ days)", cells: [true, true, true, true] },
  { label: "Alumni feed", cells: ["Preview", "Full", "Full", "Full"] },
  { label: "Feed ads", cells: ["Standard", "Reduced", "Ad-free", "Ad-free"] },
  { label: "Post jobs & referrals", cells: [false, true, true, true] },
  { label: "Video calling", cells: [callCell("student"), callCell("associate"), callCell("premium"), callCell("life")] },
  { label: "Gallery storage", cells: [gb(TIER_GALLERY_BYTES.student), gb(TIER_GALLERY_BYTES.associate), gb(TIER_GALLERY_BYTES.premium), gb(TIER_GALLERY_BYTES.life)] },
  { label: "Daily-game archive", cells: [false, true, true, true] },
  { label: "Highlighted profile", cells: [false, false, true, true] },
  { label: "List your business", cells: [false, false, true, true] },
  { label: "Earlier event invitations", cells: ["Standard", "Earlier", "Earlier", "Earliest"] },
  { label: "Yearly Certificate of Contribution", cells: [false, false, true, true] },
  { label: "Eligible for the Committee", cells: [false, false, false, true] },
]
const COLS: { key: string; name: string; price: string; tier?: TierKey }[] = [
  { key: "free", name: "Free", price: "₹0" },
  { key: "associate", name: "Associate", price: `${rupees(PLANS.associate.priceInr)}/yr`, tier: "associate" },
  { key: "premium", name: "Premium", price: `${rupees(PLANS.premium.priceInr)}/yr`, tier: "premium" },
  { key: "life", name: "Life", price: `${rupees(PLANS.life.priceInr)}`, tier: "life" },
]

/* ── Real, verifiable testimonials go here. Empty = the section doesn't render.
   Do NOT invent quotes — add them only with the member's real words + consent. ── */
const TESTIMONIALS: { quote: string; name: string; batch: string }[] = []

const BASELINE = [
  "Alumni directory & search", "Events & groups", "Direct messaging",
  "The community feed", "Voting rights (verified, 30+ days)", "Daily games",
]

const PILLARS = [
  { icon: GraduationCap, title: "Scholarships", desc: "Support for current JNV Nagpur students to pursue higher education." },
  { icon: HeartHandshake, title: "Welfare drives", desc: "A safety net for alumni and the JNV community in times of crisis." },
  { icon: MapPin, title: "Events & reunions", desc: "Founders' Day, batch meetups, and professional gatherings." },
  { icon: Server, title: "The platform", desc: "Hosting, upkeep, and new tools that keep the network alive." },
]

const FAQS: { q: string; a: string }[] = [
  { q: "Why upgrade instead of staying free?", a: "The free tier is genuinely useful — directory, events, groups, messaging and voting are all free forever. Paid tiers make the everyday experience better: fewer or no ads, longer video calls, more storage, job posting, a business listing, and a profile that stands out. You're paying for a better experience, and funding the association at the same time." },
  { q: "How do I pay, and can I change my mind?", a: "Securely via Razorpay — UPI, card or netbanking, in about two minutes. Contributions are non-refundable (you'll acknowledge this at checkout), but if you ever lapse you get a 30-day grace period with full benefits, and your posts, connections and profile always stay intact." },
  { q: "Can I upgrade later?", a: `Yes. Start where you like and move up anytime. Associate → Premium costs only the ₹${ASSOCIATE_TO_PREMIUM_DELTA_INR} difference, and you keep your original renewal date — you never restart the clock.` },
  { q: "Is it worth it if I don't post much?", a: "Even quiet members get real value: an ad-free, uncapped feed to read, more storage for photos, longer calls with old friends, and — on Premium — a highlighted profile so others find you. And your contribution funds scholarships and welfare whether you post daily or once a year." },
  { q: "Is this a subscription or a donation?", a: "Both, honestly. It's a contribution to NNAWCA — a registered charitable association — and the membership benefits are how we say thank you. Associate and Premium renew yearly; Life is a one-time payment that never renews." },
]

/* ─────────────────────────── Sub-components ─────────────────────────── */

function TierSwitch({ current }: { current: TierKey }) {
  const order: TierKey[] = ["associate", "premium", "life"]
  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
      {order.map((k) => {
        const t = TIERS[k]
        const active = k === current
        return (
          <Link
            key={k}
            href={`/membership/${k}`}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors sm:px-5"
            style={active ? { background: t.accent, color: t.onAccent } : { color: "#5b6472" }}
          >
            {t.name.replace("Alumni ", "").replace(" Member", "")}
          </Link>
        )
      })}
    </div>
  )
}

function CompareCell({ v, accentInk }: { v: Cell; accentInk: string }) {
  if (v === true) return <Check className="mx-auto h-[18px] w-[18px]" style={{ color: accentInk }} aria-label="Included" />
  if (v === false) return <Minus className="mx-auto h-[18px] w-[18px] text-gray-300" aria-label="Not included" />
  return <span className="text-[13px] font-medium text-gray-700">{v}</span>
}

function ComparisonTable({ tier }: { tier: TierKey }) {
  const t = TIERS[tier]
  return (
    <section id="compare" className="mx-auto max-w-[1080px] px-5 py-16 sm:py-20">
      <div className="mx-auto mb-10 max-w-[44ch] text-center">
        <h2 className="text-[30px] font-extrabold tracking-tight sm:text-[36px]">Free vs paid, at a glance</h2>
        <p className="mt-3 text-[15px] text-gray-600">Everything the free tier gives you — and exactly what each paid tier adds.</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-4 text-[12px] font-semibold uppercase tracking-wide text-gray-400" />
              {COLS.map((c) => {
                const isCur = c.tier === tier
                return (
                  <th key={c.key} className="px-3 py-4 text-center" style={isCur ? { background: t.accentSoft } : undefined}>
                    <span className="block text-[14px] font-extrabold" style={isCur ? { color: t.accentInk } : { color: "#111827" }}>{c.name}</span>
                    <span className="mt-0.5 block text-[12px] font-medium tabular-nums text-gray-500">{c.price}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row, i) => (
              <tr key={row.label} className={i % 2 ? "bg-gray-50/50" : "bg-white"}>
                <td className="sticky left-0 z-10 px-4 py-3 text-[13.5px] font-medium text-gray-800" style={{ background: i % 2 ? "#fafafb" : "#fff" }}>{row.label}</td>
                {row.cells.map((cell, j) => {
                  const isCur = COLS[j].tier === tier
                  return (
                    <td key={j} className="px-3 py-3 text-center" style={isCur ? { background: t.accentSoft } : undefined}>
                      <CompareCell v={cell} accentInk={t.accentInk} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-center">
        <Link
          href={`/upgrade/${t.key}`}
          className={`inline-flex items-center gap-2 rounded-full px-7 py-3 text-[15px] font-bold shadow-lg transition-transform hover:-translate-y-0.5 ${CTA_FX}`}
          style={{ background: t.accent, color: t.onAccent, boxShadow: `0 14px 34px -14px ${t.accent}99` }}
        >
          {t.cta} — {rupees(t.priceInr)}{t.per === "/year" ? "/yr" : ""} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

/* A small, tasteful CSS mock that SHOWS the tier's flagship benefit instead of
   just naming it. No images — pure markup, tinted by the tier accent. */
function FlagshipVisual({ tier }: { tier: TierKey }) {
  const bar = (w: string, shade = "#e5e7eb") => (
    <span className="block h-2 rounded-full" style={{ width: w, background: shade }} />
  )
  const Post = ({ w = "70%" }: { w?: string }) => (
    <div className="flex items-center gap-2.5">
      <span className="h-7 w-7 flex-shrink-0 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-1.5">{bar("40%", "#d1d5db")}{bar(w)}</div>
    </div>
  )
  return (
    <div className="w-full max-w-[300px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {tier === "premium" && (
        <div className="space-y-3.5">
          <Post w="80%" />
          {/* the ad slot — struck out */}
          <div className="relative rounded-lg border border-dashed border-gray-200 p-2.5">
            <div className="flex items-center gap-2 opacity-40">
              <span className="h-5 w-5 rounded bg-gray-200" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Sponsored · Ad</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                <Check className="h-3 w-3" /> No ads for you
              </span>
            </div>
          </div>
          <Post w="65%" />
        </div>
      )}
      {tier === "associate" && (
        <div className="space-y-3.5">
          <Post w="80%" /><Post w="60%" /><Post w="72%" />
          <div className="pt-1 text-center">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
              <Check className="h-3 w-3" /> Keep scrolling — no limit
            </span>
          </div>
        </div>
      )}
      {tier === "life" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Membership</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}><InfinityIcon className="h-3 w-3" /> Lifetime</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
            <span className="text-[13px] text-gray-500">Paid</span>
            <span className="text-[15px] font-extrabold tabular-nums text-gray-900">₹9,999 · once</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-gray-500">Renews</span>
            <span className="text-[13px] font-bold" style={{ color: "var(--accent-ink)" }}>Never</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-gray-500">Expires</span>
            <span className="text-[13px] font-bold" style={{ color: "var(--accent-ink)" }}>Never</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Page ─────────────────────────── */

// Shared a11y polish for CTAs: visible keyboard focus + no motion when the
// viewer prefers reduced motion.
const CTA_FX = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"

export function TierLanding({ tier, memberCount = 0, guest = false }: { tier: TierKey; memberCount?: number; guest?: boolean }) {
  const t = TIERS[tier]
  const Icon = t.icon
  const [open, setOpen] = useState<number | null>(0)

  const vars = {
    ["--accent" as string]: t.accent,
    ["--accent-ink" as string]: t.accentInk,
    ["--accent-soft" as string]: t.accentSoft,
    ["--on-accent" as string]: t.onAccent,
  } as React.CSSProperties

  // Honest social proof: show a real member count only when it's meaningful,
  // rounded DOWN to a round number so "N+" is never an overstatement.
  const roundedMembers = memberCount >= 100 ? Math.floor(memberCount / 100) * 100
    : memberCount >= 50 ? Math.floor(memberCount / 50) * 50
    : memberCount >= 20 ? Math.floor(memberCount / 10) * 10 : 0

  return (
    <div style={vars} className={`bg-white text-gray-900 ${guest ? "pb-20 lg:pb-0" : ""}`}>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[420px] max-w-[820px] rounded-full opacity-60 blur-3xl"
          style={{ background: `radial-gradient(closest-side, var(--accent-soft), transparent)` }}
        />
        <div className="relative mx-auto max-w-[900px] px-5 pb-14 pt-10 text-center sm:pt-14">
          <div className="mb-8 flex justify-center">
            <TierSwitch current={tier} />
          </div>

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
            <Icon className="h-8 w-8" />
          </div>

          {t.badge && (
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold uppercase tracking-wide" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
              {t.badge}
            </span>
          )}

          <h1 className="mx-auto max-w-[20ch] text-balance text-[38px] font-extrabold leading-[1.06] tracking-tight sm:text-[54px]">
            {t.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-[54ch] text-[16px] leading-relaxed text-gray-600 sm:text-[17px]">
            {t.blurb}
          </p>

          <div className="mt-8 flex items-end justify-center gap-2">
            <span className="text-[52px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[64px]">{rupees(t.priceInr)}</span>
            <span className="mb-2 text-[15px] font-medium text-gray-500">{t.per}</span>
          </div>
          {t.perMonthNote && <p className="mt-1 text-[13.5px] font-medium" style={{ color: "var(--accent-ink)" }}>{t.perMonthNote}</p>}

          <div className="mt-8 flex justify-center">
            <Link
              href={`/upgrade/${t.key}`}
              className={`inline-flex items-center gap-2 rounded-full px-9 py-4 text-[16px] font-bold shadow-lg transition-transform hover:-translate-y-0.5 ${CTA_FX}`}
              style={{ background: "var(--accent)", color: "var(--on-accent)", boxShadow: `0 16px 38px -12px ${t.accent}aa` }}
            >
              {t.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <a href="#compare" className="mt-4 inline-block text-[14px] font-semibold text-gray-500 underline-offset-4 hover:underline">
            See how it compares to Free ↓
          </a>

          {/* Trust strip — real, verifiable signals only */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-gray-500">
            {roundedMembers > 0 && (
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" style={{ color: "var(--accent-ink)" }} /> Join {roundedMembers.toLocaleString("en-IN")}+ JNV Nagpur alumni</span>
            )}
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" style={{ color: "var(--accent-ink)" }} /> Secure payments via Razorpay</span>
            <span className="inline-flex items-center gap-1.5"><Landmark className="h-4 w-4" style={{ color: "var(--accent-ink)" }} /> A registered charitable association</span>
          </div>

          <p className="mx-auto mt-6 max-w-[48ch] text-[13px] text-gray-400">
            NNAWCA's platform is brand new — the alumni who join now are its <span className="font-semibold" style={{ color: "var(--accent-ink)" }}>founding contributors</span>, shaping what it becomes.
          </p>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <div className="bg-gray-50">
        <ComparisonTable tier={tier} />
      </div>

      {/* ── Features ── */}
      <section className="mx-auto max-w-[1080px] px-5 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-[42ch] text-center">
          <p className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--accent-ink)" }}>{t.addsLabel}</p>
          <h2 className="mt-2 text-[30px] font-extrabold tracking-tight sm:text-[36px]">{t.builtOn ?? "Everything you need to stay in the network"}</h2>
        </div>

        {/* Flagship benefit — spotlighted and SHOWN, not just listed */}
        {(() => {
          const F0 = t.features[0]
          const F0Icon = F0.icon
          return (
            <div className="mb-4 grid items-center gap-6 overflow-hidden rounded-3xl border p-7 sm:p-9 lg:grid-cols-2" style={{ borderColor: t.accent + "40", background: `linear-gradient(160deg, ${t.accentSoft}, #ffffff 70%)` }}>
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                  <F0Icon className="h-6 w-6" />
                </div>
                <h3 className="text-[22px] font-extrabold tracking-tight text-gray-900 sm:text-[26px]">{F0.title}</h3>
                <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-gray-600">{F0.desc}</p>
              </div>
              <div className="flex justify-center lg:justify-end">
                <FlagshipVisual tier={tier} />
              </div>
            </div>
          )
        })()}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.slice(1).map((f) => {
            const FIcon = f.icon
            return (
              <div key={f.title} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                  <FIcon className="h-5 w-5" />
                </div>
                <h3 className="text-[16px] font-bold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">{f.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-8 rounded-3xl bg-gray-50 p-6 sm:p-8">
          <p className="text-[13px] font-bold uppercase tracking-widest text-gray-500">Every member — free — already gets</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2.5">
            {BASELINE.map((b) => (
              <span key={b} className="inline-flex items-center gap-2 text-[14px] text-gray-700">
                <Check className="h-4 w-4 flex-shrink-0" style={{ color: "var(--accent-ink)" }} /> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials (renders only when real quotes exist) ── */}
      {TESTIMONIALS.length > 0 && (
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="mx-auto max-w-[1080px] px-5">
            <h2 className="mb-10 text-center text-[30px] font-extrabold tracking-tight sm:text-[36px]">What members say</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((tm) => (
                <figure key={tm.name} className="rounded-3xl border border-gray-100 bg-white p-6">
                  <blockquote className="text-[15px] leading-relaxed text-gray-700">&ldquo;{tm.quote}&rdquo;</blockquote>
                  <figcaption className="mt-4 text-[13px] font-semibold text-gray-900">{tm.name} <span className="font-normal text-gray-500">· {tm.batch}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-[760px] px-5 py-16 sm:py-20">
        <h2 className="mb-8 text-center text-[30px] font-extrabold tracking-tight sm:text-[36px]">Questions, answered</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={isOpen}>
                  <span className="text-[15px] font-semibold text-gray-900">{f.q}</span>
                  <ChevronDown className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <p className="border-t border-gray-100 px-5 py-4 text-[14.5px] leading-relaxed text-gray-600">{f.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Gives back (charity, as a bonus reason — demoted from the lede) ── */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1080px] px-5">
          <div className="mx-auto mb-12 max-w-[46ch] text-center">
            <p className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--accent-ink)" }}>And it gives back</p>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-tight sm:text-[36px]">Your {rupees(t.priceInr)} does real good, too</h2>
            <p className="mt-3 text-[15px] text-gray-600">Membership is a contribution to NNAWCA — pooled to serve JNV Nagpur students and alumni.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => {
              const PIcon = p.icon
              return (
                <div key={p.title} className="rounded-3xl border border-gray-100 bg-white p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                    <PIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-[15.5px] font-bold text-gray-900">{p.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600">{p.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-[1080px] overflow-hidden rounded-[32px] px-6 py-14 text-center sm:py-16" style={{ background: `linear-gradient(160deg, var(--accent), var(--accent-ink))` }}>
          <h2 className="mx-auto max-w-[20ch] text-balance text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]" style={{ color: "var(--on-accent)" }}>
            Ready to join as {t.name.replace("Alumni ", "")}?
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15px]" style={{ color: "var(--on-accent)", opacity: 0.9 }}>
            {rupees(t.priceInr)} {t.per} · about two minutes to join.
          </p>
          <Link
            href={`/upgrade/${t.key}`}
            className={`mt-8 inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-[16px] font-bold shadow-lg transition-transform hover:-translate-y-0.5 ${CTA_FX}`}
            style={{ color: "var(--accent-ink)" }}
          >
            {t.cta} <ArrowRight className="h-4 w-4" />
          </Link>
          {t.anchor && (
            <p className="mt-5 text-[13px]" style={{ color: "var(--on-accent)", opacity: 0.85 }}>
              <Link href={t.anchor.href} className="underline underline-offset-2">{t.anchor.label}</Link>
            </p>
          )}
          <p className="mt-4 text-[12.5px]" style={{ color: "var(--on-accent)", opacity: 0.72 }}>
            30-day grace period if you ever lapse · your posts &amp; connections always stay yours
          </p>
        </div>
      </section>

      {/* ── Sticky mobile CTA (guests only — logged-in members have the tab bar) ── */}
      {guest && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
            <div className="leading-tight">
              <span className="block text-[16px] font-extrabold tabular-nums">
                {rupees(t.priceInr)}<span className="text-[12px] font-medium text-gray-500"> {t.per}</span>
              </span>
              <span className="block text-[11px] text-gray-500">{t.name}</span>
            </div>
            <Link
              href={`/upgrade/${t.key}`}
              className={`flex-1 max-w-[220px] rounded-full px-5 py-3 text-center text-[15px] font-bold ${CTA_FX}`}
              style={{ background: t.accent, color: t.onAccent }}
            >
              {t.cta}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
