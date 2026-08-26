"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Check, ChevronDown, ArrowRight, Minus,
  ShieldOff, Store, CalendarClock, Award, Users, Video, Images,
  Briefcase, Rss, Gamepad2, BadgeCheck, Sparkles, Crown, Star,
  Infinity as InfinityIcon, GraduationCap, HeartHandshake, MapPin, Server,
  ShieldCheck, Landmark,
} from "lucide-react"
import {
  PLANS, ASSOCIATE_TO_PREMIUM_DELTA_INR,
  TIER_GALLERY_BYTES, type PlanCode,
} from "@/config/membership"
import { TIER_CALL_LIMITS } from "@/config/calls"

export type TierKey = "associate" | "premium" | "life"

type Feature = { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }

interface TierConfig {
  key: TierKey
  name: string
  short: string
  eyebrow: string
  tagline: string
  blurb: string
  priceInr: number
  per: string
  perMonthNote?: string
  anchor?: { label: string; href: string }
  badge?: string
  icon: React.ComponentType<{ className?: string }>
  /** Jewel accent for this tier + a soft tint + the membership-card gradient. */
  acc: string
  accSoft: string
  card: string // css background for the membership card
  cardInk: string // text colour on the card
  addsLabel: string
  builtOn?: string
  features: Feature[]
  cta: string
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`
const perMonth = (yearly: number) => `about ${rupees(Math.round(yearly / 12))} a month`

const NAVY = "#0b1b34"

const TIERS: Record<TierKey, TierConfig> = {
  associate: {
    key: "associate", name: "Alumni Associate", short: "Associate",
    eyebrow: "Alumni Associate · for JNV Nagpur",
    tagline: "The whole network, without the limits.",
    blurb: "Post jobs and referrals, call alumni for up to thirty minutes, keep your reunion photos, and read a fuller feed with fewer ads. The everyday membership most alumni choose.",
    priceInr: PLANS.associate.priceInr, per: "/year", perMonthNote: perMonth(PLANS.associate.priceInr),
    anchor: { label: `Upgrade to Premium anytime for just the ₹${ASSOCIATE_TO_PREMIUM_DELTA_INR} difference`, href: "/membership/premium" },
    badge: "Most chosen", icon: Star,
    acc: "#2f6fd6", accSoft: "#eaf1fc",
    card: `linear-gradient(135deg, #0f2444 0%, #14315e 55%, #2f6fd6 140%)`, cardInk: "#eaf1fc",
    addsLabel: "What Associate adds",
    features: [
      { icon: Rss, title: "A full, uncapped feed", desc: "The whole alumni feed — with fewer ads than the free tier." },
      { icon: Briefcase, title: "Post jobs & referrals", desc: "Hire from the network, and get hired by it." },
      { icon: Video, title: "Included video calling", desc: "Up to thirty minutes per call — no per-call charge." },
      { icon: Images, title: "1 GB gallery storage", desc: "Room to share reunion and batch memories." },
      { icon: Gamepad2, title: "The daily-game archive", desc: "Play past puzzles, not just today's." },
      { icon: BadgeCheck, title: "A verified Associate badge", desc: "Shown on your profile across the platform." },
    ],
    cta: "Become an Associate",
  },
  premium: {
    key: "premium", name: "Alumni Premium", short: "Premium",
    eyebrow: "Alumni Premium · for JNV Nagpur",
    tagline: "No ads. A profile that stands out. Your business in front of everyone.",
    blurb: "The best everyday experience on the network — an ad-free feed, a highlighted profile, your own business listing, longer calls, and five times the storage.",
    priceInr: PLANS.premium.priceInr, per: "/year", perMonthNote: perMonth(PLANS.premium.priceInr),
    anchor: { label: "Or make it permanent — Life is ₹9,999 once, and never renews", href: "/membership/life" },
    badge: "The best experience", icon: Sparkles,
    acc: "#1f7a4d", accSoft: "#e6f2ea",
    card: `linear-gradient(135deg, #0d2136 0%, #10402a 55%, #1f7a4d 140%)`, cardInk: "#e6f2ea",
    addsLabel: "Exclusive to Premium",
    builtOn: "Everything in Associate, and then:",
    features: [
      { icon: ShieldOff, title: "A completely ad-free feed", desc: "No in-stream ads, no sidebar ads. Only the network." },
      { icon: Sparkles, title: "A highlighted profile", desc: "Your card stands out in the directory, with a Premium mark." },
      { icon: Store, title: "Your own business listing", desc: "Put your business in front of the whole alumni network." },
      { icon: Video, title: "Longer video calls", desc: "Up to sixty minutes each." },
      { icon: Images, title: "5 GB gallery storage", desc: "Five times the space to share and archive photos." },
      { icon: CalendarClock, title: "Earlier event invitations", desc: "Hear about limited-seat events before Associates do." },
      { icon: Award, title: "A yearly Certificate of Contribution", desc: "A certificate to download, every year." },
    ],
    cta: "Go Premium",
  },
  life: {
    key: "life", name: "Life Member", short: "Life",
    eyebrow: "Life Membership · for JNV Nagpur",
    tagline: "Pay once. Every benefit, for life.",
    blurb: "One payment, and you never renew again — every Premium benefit permanently, the longest calls, the most storage, and a seat you can be invited to on the NNAWCA Committee.",
    priceInr: PLANS.life.priceInr, per: "· one payment", perMonthNote: "Never renews — Premium is ₹999 every year",
    anchor: { label: "Not ready for a lifetime? Premium is ₹999 a year", href: "/membership/premium" },
    badge: "Never renews", icon: Crown,
    acc: "#b8901f", accSoft: "#f6ecd2",
    card: `linear-gradient(135deg, #7a5c12 0%, #b8901f 50%, #e3c766 135%)`, cardInk: "#241a04",
    addsLabel: "Exclusive to Life",
    builtOn: "Everything in Premium — for life, and then:",
    features: [
      { icon: InfinityIcon, title: "It never renews or expires", desc: "Pay once. Your benefits never lapse." },
      { icon: Crown, title: "A permanent Life Member badge", desc: "A distinction that stays with you." },
      { icon: Video, title: "The longest video calls", desc: "Up to ninety minutes each." },
      { icon: Images, title: "10 GB gallery storage", desc: "The most space of any tier." },
      { icon: Users, title: "Eligibility for the Committee", desc: "Only Life Members can be invited onto the NNAWCA Committee." },
      { icon: Award, title: "A lifetime Certificate of Contribution", desc: "Recognition of a permanent contribution." },
    ],
    cta: "Become a Life Member",
  },
}

/* ── Free vs paid comparison — the real, enforced entitlements ── */
const gb = (bytes: number) => {
  const g = bytes / (1024 ** 3)
  return g >= 1 ? `${g % 1 === 0 ? g : g.toFixed(0)} GB` : `${Math.round(bytes / (1024 ** 2))} MB`
}
const callCell = (k: PlanCode) => (TIER_CALL_LIMITS[k] ? `${TIER_CALL_LIMITS[k]!.perCallMin} min` : "Pay-per-pass")
type Cell = boolean | string
const COMPARE: { label: string; cells: [Cell, Cell, Cell, Cell] }[] = [
  { label: "Directory, events, groups & messaging", cells: [true, true, true, true] },
  { label: "Voting rights (verified, 30+ days)", cells: [true, true, true, true] },
  { label: "Alumni feed", cells: ["Preview", "Full", "Full", "Full"] },
  { label: "Feed ads", cells: ["Standard", "Reduced", "None", "None"] },
  { label: "Post jobs & referrals", cells: [false, true, true, true] },
  { label: "Video calling", cells: [callCell("student"), callCell("associate"), callCell("premium"), callCell("life")] },
  { label: "Gallery storage", cells: [gb(TIER_GALLERY_BYTES.student), gb(TIER_GALLERY_BYTES.associate), gb(TIER_GALLERY_BYTES.premium), gb(TIER_GALLERY_BYTES.life)] },
  { label: "Daily-game archive", cells: [false, true, true, true] },
  { label: "Highlighted profile", cells: [false, false, true, true] },
  { label: "Your own business listing", cells: [false, false, true, true] },
  { label: "Earlier event invitations", cells: ["Standard", "Earlier", "Earlier", "Earliest"] },
  { label: "Yearly Certificate of Contribution", cells: [false, false, true, true] },
  { label: "Eligible for the Committee", cells: [false, false, false, true] },
]
const COLS: { key: string; name: string; price: string; tier?: TierKey }[] = [
  { key: "free", name: "Free", price: "₹0" },
  { key: "associate", name: "Associate", price: `${rupees(PLANS.associate.priceInr)}/yr`, tier: "associate" },
  { key: "premium", name: "Premium", price: `${rupees(PLANS.premium.priceInr)}/yr`, tier: "premium" },
  { key: "life", name: "Life", price: rupees(PLANS.life.priceInr), tier: "life" },
]

/* Add real member quotes here (with consent) — the section renders only when non-empty. */
const TESTIMONIALS: { quote: string; name: string; batch: string }[] = []

const BASELINE = [
  "Alumni directory & search", "Events & groups", "Direct messaging",
  "The community feed", "Voting rights", "Daily games",
]

const PILLARS = [
  { icon: GraduationCap, title: "Scholarships", desc: "Support for current JNV Nagpur students to pursue higher education." },
  { icon: HeartHandshake, title: "Welfare drives", desc: "A safety net for alumni and the JNV community in times of crisis." },
  { icon: MapPin, title: "Events & reunions", desc: "Founders' Day, batch meetups, and professional gatherings." },
  { icon: Server, title: "The platform", desc: "Hosting, upkeep, and the tools that keep the network alive." },
]

const FAQS: { q: string; a: string }[] = [
  { q: "Why upgrade instead of staying free?", a: "The free tier is genuinely useful — directory, events, groups, messaging and voting are all free forever. Paid tiers make the everyday experience better: fewer or no ads, longer video calls, more storage, job posting, a business listing, and a profile that stands out. You pay for a better experience, and fund the association at the same time." },
  { q: "How do I pay, and can I change my mind?", a: "Securely via Razorpay — UPI, card or netbanking, in about two minutes. Contributions are non-refundable (you acknowledge this at checkout), but if you ever lapse you get a 30-day grace period with full benefits, and your posts, connections and profile always stay intact." },
  { q: "Can I upgrade later?", a: `Yes. Start where you like and move up anytime. Associate → Premium costs only the ₹${ASSOCIATE_TO_PREMIUM_DELTA_INR} difference, and you keep your original renewal date — you never restart the clock.` },
  { q: "Is it worth it if I don't post much?", a: "Even quiet members get real value: an ad-free, uncapped feed to read, more storage for photos, longer calls with old friends, and — on Premium — a highlighted profile so others find you. And your contribution funds scholarships and welfare whether you post daily or once a year." },
  { q: "Is this a subscription or a donation?", a: "Both, honestly. It is a contribution to NNAWCA — a registered charitable association — and the membership benefits are how we say thank you. Associate and Premium renew yearly; Life is one payment that never renews." },
]

/* ─────────────────────────── pieces ─────────────────────────── */

const serif: React.CSSProperties = { fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif" }

function Monogram({ className = "", tone = "gold" }: { className?: string; tone?: "gold" | "ink" }) {
  const stroke = tone === "gold" ? "var(--gold)" : NAVY
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="37" height="37" rx="7" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
        <path d="M12 28V12l16 16V12" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[15px] font-bold tracking-[0.14em]" style={{ color: tone === "gold" ? "var(--on-ink)" : NAVY }}>NNAWCA</span>
    </span>
  )
}

function MembershipCard({ tier }: { tier: TierKey }) {
  const t = TIERS[tier]
  return (
    <div className="reveal relative w-full max-w-[380px] [transform:rotate(-5deg)] transition-transform duration-500 hover:[transform:rotate(-2deg)] motion-reduce:transform-none motion-reduce:hover:transform-none">
      <div
        className="aspect-[1.6/1] rounded-[20px] p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/10"
        style={{ background: t.card, color: t.cardInk }}
      >
        {/* gold foil texture */}
        <div className="pointer-events-none absolute inset-0 rounded-[20px] opacity-[0.14]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, var(--gold) 1px, transparent 1.5px)", backgroundSize: "22px 22px" }} />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-bold tracking-[0.16em]" style={{ opacity: 0.92 }}>NNAWCA</span>
            {/* card chip */}
            <span className="h-6 w-8 rounded-[5px]" style={{ background: "linear-gradient(135deg, var(--gold-bright), var(--gold-deep))" }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ opacity: 0.7 }}>{t.badge}</p>
            <p className="mt-1 text-[26px] leading-none" style={{ ...serif, fontWeight: 600 }}>{t.short} Member</p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ opacity: 0.6 }}>Member</p>
              <p className="text-[14px] font-semibold tracking-wide" style={{ opacity: 0.95 }}>Your Name</p>
            </div>
            <p className="text-[11px] font-medium tracking-wide" style={{ opacity: 0.75 }}>
              {tier === "life" ? "Lifetime" : "Since 2026"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TierSwitch({ current }: { current: TierKey }) {
  const order: TierKey[] = ["associate", "premium", "life"]
  return (
    <nav className="flex items-center gap-1 sm:gap-2" aria-label="Membership tiers">
      {order.map((k) => {
        const active = k === current
        return (
          <Link
            key={k}
            href={`/membership/${k}`}
            className="relative px-2.5 py-1.5 text-[13px] font-semibold tracking-wide transition-colors sm:px-3.5"
            style={{ color: active ? "var(--on-ink)" : "rgba(242,236,222,0.55)" }}
          >
            {TIERS[k].short}
            {active && <span className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full sm:inset-x-3.5" style={{ background: "var(--gold)" }} />}
          </Link>
        )
      })}
    </nav>
  )
}

function CompareCell({ v, acc }: { v: Cell; acc: string }) {
  if (v === true) return <Check className="mx-auto h-[18px] w-[18px]" style={{ color: acc }} aria-label="Included" />
  if (v === false) return <Minus className="mx-auto h-[18px] w-[18px]" style={{ color: "#c9c2b2" }} aria-label="Not included" />
  return <span className="text-[13px] font-medium" style={{ color: "var(--on-paper)" }}>{v}</span>
}

/* ─────────────────────────── page ─────────────────────────── */

const CTA_FX = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"

export function TierLanding({ tier, memberCount = 0, guest = false }: { tier: TierKey; memberCount?: number; guest?: boolean }) {
  const t = TIERS[tier]
  const [open, setOpen] = useState<number | null>(0)

  const vars = {
    ["--ink" as string]: NAVY,
    ["--gold" as string]: "#c9a227",
    ["--gold-bright" as string]: "#e3c766",
    ["--gold-deep" as string]: "#8a6d16",
    ["--paper" as string]: "#f7f3ea",
    ["--on-paper" as string]: "#20293a",
    ["--mute-paper" as string]: "#6f6a5d",
    ["--on-ink" as string]: "#f4eee1",
    ["--mute-ink" as string]: "#9aa6bd",
    ["--acc" as string]: t.acc,
    ["--acc-soft" as string]: t.accSoft,
  } as React.CSSProperties

  const rounded = memberCount >= 100 ? Math.floor(memberCount / 100) * 100
    : memberCount >= 50 ? Math.floor(memberCount / 50) * 50
    : memberCount >= 20 ? Math.floor(memberCount / 10) * 10 : 0

  const goldGrad = "linear-gradient(180deg, var(--gold-bright), var(--gold))"

  return (
    <div className="heritage" style={vars}>
      {/* Heritage display face — loaded at runtime; degrades to Georgia serif. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&display=swap" />
      <style>{`
        .heritage{background:var(--paper);color:var(--on-paper)}
        .heritage .reveal{animation:hrise .7s cubic-bezier(.2,.7,.2,1) both}
        @keyframes hrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){.heritage .reveal{animation:none}}
        .heritage .gold-rule{height:2px;width:56px;background:var(--gold);border-radius:2px}
        .heritage .eyebrow{font-size:12px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;color:var(--gold-deep)}
      `}</style>

      {/* ══ HERO — navy, editorial, asymmetric ══ */}
      <section className="relative overflow-hidden" style={{ background: `radial-gradient(120% 90% at 85% -10%, #12325f 0%, var(--ink) 55%)` }}>
        {/* gold dot texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "radial-gradient(circle at 15% 25%, var(--gold) 1px, transparent 1.6px), radial-gradient(circle at 80% 70%, var(--gold) 1px, transparent 1.6px)", backgroundSize: "120px 120px, 150px 150px" }} />
        <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
          {/* top bar */}
          <div className="flex items-center justify-between py-6">
            <Monogram />
            <TierSwitch current={tier} />
          </div>

          <div className="grid items-center gap-12 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24 lg:pt-12">
            {/* left — the pitch */}
            <div className="reveal">
              <p className="eyebrow">{t.eyebrow}</p>
              <h1 className="mt-5 text-balance text-[40px] leading-[1.04] tracking-[-0.01em] sm:text-[58px]" style={{ ...serif, color: "var(--on-ink)", fontWeight: 500 }}>
                {t.tagline}
              </h1>
              <div className="gold-rule mt-7" />
              <p className="mt-6 max-w-[48ch] text-[16px] leading-relaxed" style={{ color: "var(--mute-ink)" }}>{t.blurb}</p>

              <div className="mt-9 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[46px] leading-none tabular-nums" style={{ ...serif, color: "var(--on-ink)", fontWeight: 600 }}>{rupees(t.priceInr)}</span>
                <span className="text-[15px] font-medium" style={{ color: "var(--mute-ink)" }}>{t.per}</span>
                {t.perMonthNote && <span className="w-full text-[13px]" style={{ color: "var(--gold-bright)" }}>{t.perMonthNote}</span>}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={`/upgrade/${t.key}`} className={`inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[15px] font-bold transition-transform hover:-translate-y-0.5 ${CTA_FX}`} style={{ background: goldGrad, color: NAVY, boxShadow: "0 18px 40px -14px rgba(201,162,39,0.55)" }}>
                  {t.cta} <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#compare" className="inline-flex items-center gap-1.5 rounded-full border px-6 py-3.5 text-[15px] font-semibold transition-colors" style={{ borderColor: "rgba(244,238,225,0.25)", color: "var(--on-ink)" }}>
                  See what's included
                </a>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]" style={{ color: "var(--mute-ink)" }}>
                {rounded > 0 && <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" style={{ color: "var(--gold)" }} /> {rounded.toLocaleString("en-IN")}+ alumni have joined</span>}
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" style={{ color: "var(--gold)" }} /> Secure payments · Razorpay</span>
                <span className="inline-flex items-center gap-1.5"><Landmark className="h-4 w-4" style={{ color: "var(--gold)" }} /> A registered charitable association</span>
              </div>
            </div>

            {/* right — the membership card */}
            <div className="flex flex-col items-center gap-4 lg:items-end">
              <MembershipCard tier={tier} />
              <p className="text-[12px] tracking-wide" style={{ color: "var(--mute-ink)" }}>The alumni who join now are its founding contributors.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ BASELINE ribbon — paper ══ */}
      <section className="border-y" style={{ borderColor: "rgba(201,162,39,0.28)" }}>
        <div className="mx-auto max-w-[1180px] px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <span className="eyebrow flex-shrink-0">Every member is entitled to</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {BASELINE.map((b) => (
                <span key={b} className="inline-flex items-center gap-2 text-[14px]" style={{ color: "var(--on-paper)" }}>
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: "var(--gold-deep)" }} /> {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ COMPARISON ledger — paper ══ */}
      <section id="compare" className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-24">
        <p className="eyebrow">The plans, side by side</p>
        <h2 className="mt-3 max-w-[18ch] text-[32px] leading-tight tracking-tight sm:text-[42px]" style={{ ...serif, fontWeight: 500 }}>
          Everything the free tier gives — and what each tier adds.
        </h2>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b-2" style={{ borderColor: "var(--gold)" }}>
                <th className="py-4 pr-4" />
                {COLS.map((c) => {
                  const cur = c.tier === tier
                  return (
                    <th key={c.key} className="px-3 py-4 text-center align-bottom" style={cur ? { background: "var(--acc-soft)" } : undefined}>
                      <span className="block text-[16px]" style={{ ...serif, fontWeight: 600, color: cur ? "var(--acc)" : "var(--on-paper)" }}>{c.name}</span>
                      <span className="mt-0.5 block text-[12px] font-medium tabular-nums" style={{ color: "var(--mute-paper)" }}>{c.price}</span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label} className="border-b" style={{ borderColor: "rgba(32,41,58,0.09)" }}>
                  <td className="py-3.5 pr-4 text-[14px] font-medium" style={{ color: "var(--on-paper)" }}>{row.label}</td>
                  {row.cells.map((cell, j) => {
                    const cur = COLS[j].tier === tier
                    return (
                      <td key={j} className="px-3 py-3.5 text-center" style={cur ? { background: "var(--acc-soft)" } : undefined}>
                        <CompareCell v={cell} acc={t.acc} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10">
          <Link href={`/upgrade/${t.key}`} className={`inline-flex items-center gap-2 rounded-full px-7 py-3 text-[15px] font-bold transition-transform hover:-translate-y-0.5 ${CTA_FX}`} style={{ background: goldGrad, color: NAVY }}>
            {t.cta} — {rupees(t.priceInr)}{t.per === "/year" ? "/yr" : ""} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ══ FEATURES — navy, editorial ══ */}
      <section style={{ background: `radial-gradient(120% 80% at 15% 0%, #12325f 0%, var(--ink) 55%)` }}>
        <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-24">
          <p className="eyebrow" style={{ color: "var(--gold-bright)" }}>{t.addsLabel}</p>
          <h2 className="mt-3 max-w-[20ch] text-[32px] leading-tight tracking-tight sm:text-[42px]" style={{ ...serif, color: "var(--on-ink)", fontWeight: 500 }}>
            {t.builtOn ?? "Everything you need to stay in the network."}
          </h2>

          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {t.features.map((f, i) => {
              const FIcon = f.icon
              const flagship = i === 0
              return (
                <div key={f.title} className={flagship ? "sm:col-span-2" : ""}>
                  <div className={`flex gap-5 ${flagship ? "items-start" : ""}`}>
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(201,162,39,0.14)", color: "var(--gold-bright)" }}>
                      <FIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className={`${flagship ? "text-[24px] sm:text-[28px]" : "text-[19px]"} leading-snug`} style={{ ...serif, color: "var(--on-ink)", fontWeight: 600 }}>{f.title}</h3>
                      <p className={`mt-1.5 ${flagship ? "max-w-[52ch] text-[16px]" : "text-[14.5px]"} leading-relaxed`} style={{ color: "var(--mute-ink)" }}>{f.desc}</p>
                    </div>
                  </div>
                  {flagship && <div className="mt-8 h-px w-full" style={{ background: "rgba(201,162,39,0.22)" }} />}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS (only if real quotes) — paper ══ */}
      {TESTIMONIALS.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8">
          <p className="eyebrow">In their words</p>
          <h2 className="mt-3 text-[32px] tracking-tight sm:text-[40px]" style={{ ...serif, fontWeight: 500 }}>What members say</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((tm) => (
              <figure key={tm.name} className="border-l-2 pl-5" style={{ borderColor: "var(--gold)" }}>
                <blockquote className="text-[16px] leading-relaxed" style={{ ...serif, color: "var(--on-paper)" }}>&ldquo;{tm.quote}&rdquo;</blockquote>
                <figcaption className="mt-3 text-[13px] font-semibold">{tm.name} <span className="font-normal" style={{ color: "var(--mute-paper)" }}>· {tm.batch}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ══ GIVES BACK — paper ══ */}
      <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-24">
        <p className="eyebrow">And it gives back</p>
        <h2 className="mt-3 max-w-[22ch] text-[32px] leading-tight tracking-tight sm:text-[42px]" style={{ ...serif, fontWeight: 500 }}>
          Your {rupees(t.priceInr)} does real good, too.
        </h2>
        <p className="mt-4 max-w-[52ch] text-[15px]" style={{ color: "var(--mute-paper)" }}>
          Membership is a contribution to NNAWCA — pooled to serve JNV Nagpur students and alumni.
        </p>
        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => {
            const PIcon = p.icon
            return (
              <div key={p.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--acc-soft)", color: "var(--gold-deep)" }}>
                  <PIcon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[18px]" style={{ ...serif, fontWeight: 600 }}>{p.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--mute-paper)" }}>{p.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══ FAQ — paper ══ */}
      <section className="border-t" style={{ borderColor: "rgba(32,41,58,0.1)" }}>
        <div className="mx-auto max-w-[820px] px-5 py-20 sm:px-8 sm:py-24">
          <p className="eyebrow">Questions</p>
          <h2 className="mt-3 text-[32px] tracking-tight sm:text-[42px]" style={{ ...serif, fontWeight: 500 }}>Answered plainly.</h2>
          <div className="mt-10 divide-y" style={{ borderColor: "rgba(32,41,58,0.1)" }}>
            {FAQS.map((f, i) => {
              const isOpen = open === i
              return (
                <div key={i} style={{ borderColor: "rgba(32,41,58,0.1)" }} className="border-t first:border-t-0">
                  <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left" aria-expanded={isOpen}>
                    <span className="text-[17px]" style={{ ...serif, fontWeight: 500, color: "var(--on-paper)" }}>{f.q}</span>
                    <ChevronDown className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--gold-deep)" }} />
                  </button>
                  {isOpen && <p className="pb-5 text-[15px] leading-relaxed" style={{ color: "var(--mute-paper)" }}>{f.a}</p>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA — navy ══ */}
      <section className="relative overflow-hidden" style={{ background: `radial-gradient(120% 100% at 50% -20%, #12325f 0%, var(--ink) 60%)` }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "radial-gradient(circle at 50% 30%, var(--gold) 1px, transparent 1.6px)", backgroundSize: "130px 130px" }} />
        <div className="relative mx-auto max-w-[820px] px-5 py-24 text-center sm:px-8">
          <div className="flex justify-center"><Monogram /></div>
          <h2 className="mx-auto mt-8 max-w-[20ch] text-balance text-[34px] leading-tight tracking-tight sm:text-[46px]" style={{ ...serif, color: "var(--on-ink)", fontWeight: 500 }}>
            Take your place as {t.short}.
          </h2>
          <p className="mx-auto mt-4 max-w-[42ch] text-[15px]" style={{ color: "var(--mute-ink)" }}>
            {rupees(t.priceInr)} {t.per} · about two minutes to join.
          </p>
          <div className="mt-9 flex justify-center">
            <Link href={`/upgrade/${t.key}`} className={`inline-flex items-center gap-2 rounded-full px-9 py-4 text-[16px] font-bold transition-transform hover:-translate-y-0.5 ${CTA_FX}`} style={{ background: goldGrad, color: NAVY, boxShadow: "0 20px 44px -14px rgba(201,162,39,0.5)" }}>
              {t.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {t.anchor && (
            <p className="mt-6 text-[13px]"><Link href={t.anchor.href} className="underline underline-offset-4" style={{ color: "var(--gold-bright)" }}>{t.anchor.label}</Link></p>
          )}
          <p className="mt-4 text-[12.5px]" style={{ color: "var(--mute-ink)" }}>30-day grace if you ever lapse · your posts &amp; connections always stay yours.</p>
        </div>
      </section>

      {/* ══ sticky mobile CTA (guests) ══ */}
      {guest && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 lg:hidden" style={{ background: "rgba(11,27,52,0.97)", borderColor: "rgba(201,162,39,0.3)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
            <div className="leading-tight">
              <span className="block text-[16px] tabular-nums" style={{ ...serif, color: "var(--on-ink)", fontWeight: 600 }}>{rupees(t.priceInr)}<span className="text-[12px] font-normal" style={{ color: "var(--mute-ink)" }}> {t.per}</span></span>
              <span className="block text-[11px]" style={{ color: "var(--mute-ink)" }}>{t.name}</span>
            </div>
            <Link href={`/upgrade/${t.key}`} className={`flex-1 max-w-[220px] rounded-full px-5 py-3 text-center text-[15px] font-bold ${CTA_FX}`} style={{ background: goldGrad, color: NAVY }}>{t.cta}</Link>
          </div>
        </div>
      )}
      {guest && <div className="h-20 lg:hidden" />}
    </div>
  )
}
