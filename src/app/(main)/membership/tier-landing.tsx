"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Check, ChevronDown, ArrowRight, Sparkles, Crown, Star,
  Rss, Briefcase, Video, Images, Gamepad2, BadgeCheck,
  ShieldOff, Store, CalendarClock, Award, MapPin, Users,
  GraduationCap, HeartHandshake, Server, Infinity as InfinityIcon,
} from "lucide-react"
import { PLANS, ASSOCIATE_TO_PREMIUM_DELTA_INR } from "@/config/membership"

export type TierKey = "associate" | "premium" | "life"

type Feature = { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }

interface TierConfig {
  key: TierKey
  name: string
  tagline: string
  blurb: string
  priceInr: number
  per: string
  badge?: string
  icon: React.ComponentType<{ className?: string }>
  /** accent hex, a darker readable-on-white variant, a soft tint bg, and text colour on the accent button */
  accent: string
  accentInk: string
  accentSoft: string
  onAccent: string
  addsLabel: string
  builtOn?: string // "Everything in Associate, plus…"
  features: Feature[]
  cta: string
}

const TIERS: Record<TierKey, TierConfig> = {
  associate: {
    key: "associate",
    name: "Alumni Associate",
    tagline: "Stay connected. Give back.",
    blurb: "The everyday membership most alumni pick — the full network, plus real tools to stay in touch, hire, and be found.",
    priceInr: PLANS.associate.priceInr,
    per: "/year",
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
    cta: "Become an Associate",
  },
  premium: {
    key: "premium",
    name: "Alumni Premium",
    tagline: "Lead, mentor, and be seen.",
    blurb: "For alumni who want the best everyday experience — a quieter, faster platform that puts you in front of the network.",
    priceInr: PLANS.premium.priceInr,
    per: "/year",
    badge: "Best experience",
    icon: Sparkles,
    accent: "#22a45d",
    accentInk: "#1a7f49",
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
    cta: "Go Premium",
  },
  life: {
    key: "life",
    name: "Life Member",
    tagline: "One payment. Membership for life.",
    blurb: "The last membership you'll ever buy. Every Premium benefit — permanently — and a seat at the table of NNAWCA.",
    priceInr: PLANS.life.priceInr,
    per: "· one-time",
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

const BASELINE = [
  "Alumni directory & search",
  "Events & groups",
  "Direct messaging",
  "The community feed",
  "Voting rights (verified, 30+ days)",
  "Daily games",
]

const PILLARS = [
  { icon: GraduationCap, title: "Scholarships", desc: "Support for current JNV Nagpur students to pursue higher education." },
  { icon: HeartHandshake, title: "Welfare drives", desc: "A safety net for alumni and the JNV community in times of crisis." },
  { icon: MapPin, title: "Events & reunions", desc: "Founders' Day, batch meetups, and professional gatherings." },
  { icon: Server, title: "The platform", desc: "Hosting, upkeep, and new tools that keep the network alive." },
]

const FAQS: { q: string; a: string }[] = [
  { q: "Is this a subscription or a donation?", a: "It's a contribution to NNAWCA — the Nagpur Navodaya Alumni Welfare and Charitable Association, a registered body. Your payment funds scholarships, welfare, events and the platform. The membership benefits are our way of saying thank you." },
  { q: "How do I pay?", a: "Securely via Razorpay — UPI, card, or netbanking. It takes about two minutes. You'll acknowledge that contributions are non-refundable before you pay." },
  { q: "Can I upgrade later?", a: `Yes. Start with Associate and move up whenever you like. Associate → Premium costs only the ₹${ASSOCIATE_TO_PREMIUM_DELTA_INR} difference, and you keep your original renewal date.` },
  { q: "What happens if my membership lapses?", a: "You get a 30-day grace period with full benefits. After that your account reverts to the free tier — your posts, connections, and profile always stay intact; only the paid features pause." },
  { q: "Who can vote in NNAWCA decisions?", a: "Any verified member active for 30+ days can vote, regardless of tier. Membership isn't required to have a voice — it's how you help fund the work." },
]

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`

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

export function TierLanding({ tier }: { tier: TierKey }) {
  const t = TIERS[tier]
  const Icon = t.icon
  const [open, setOpen] = useState<number | null>(0)

  // Accent as CSS variables so every accent-coloured element is tier-driven.
  const vars = {
    ["--accent" as string]: t.accent,
    ["--accent-ink" as string]: t.accentInk,
    ["--accent-soft" as string]: t.accentSoft,
    ["--on-accent" as string]: t.onAccent,
  } as React.CSSProperties

  return (
    <div style={vars} className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[420px] max-w-[820px] rounded-full opacity-60 blur-3xl"
          style={{ background: `radial-gradient(closest-side, var(--accent-soft), transparent)` }}
        />
        <div className="relative mx-auto max-w-[880px] px-5 pb-14 pt-10 text-center sm:pt-14">
          <div className="mb-8 flex justify-center">
            <TierSwitch current={tier} />
          </div>

          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
          >
            <Icon className="h-8 w-8" />
          </div>

          {t.badge && (
            <span
              className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold uppercase tracking-wide"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              {t.badge}
            </span>
          )}

          <h1 className="mx-auto max-w-[16ch] text-balance text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px]">
            {t.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-relaxed text-gray-600 sm:text-[17px]">
            {t.blurb}
          </p>

          <div className="mt-8 flex items-end justify-center gap-2">
            <span className="text-[52px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[64px]">
              {rupees(t.priceInr)}
            </span>
            <span className="mb-2 text-[15px] font-medium text-gray-500">{t.per}</span>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/upgrade/${t.key}`}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[15px] font-bold shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--accent)", color: "var(--on-accent)", boxShadow: `0 14px 34px -12px ${t.accent}99` }}
            >
              {t.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3.5 text-[15px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Compare all plans
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-gray-400">Secured by Razorpay · UPI, card &amp; netbanking</p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1080px] px-5 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-[40ch] text-center">
          <p className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--accent-ink)" }}>
            {t.addsLabel}
          </p>
          <h2 className="mt-2 text-[30px] font-extrabold tracking-tight sm:text-[36px]">
            {t.builtOn ?? "Everything you need to stay in the network"}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.map((f) => {
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

        {/* Baseline strip */}
        <div className="mt-8 rounded-3xl bg-gray-50 p-6 sm:p-8">
          <p className="text-[13px] font-bold uppercase tracking-widest text-gray-500">Every member — free — already gets</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2.5">
            {BASELINE.map((b) => (
              <span key={b} className="inline-flex items-center gap-2 text-[14px] text-gray-700">
                <Check className="h-4 w-4 flex-shrink-0" style={{ color: "var(--accent-ink)" }} /> {b}
              </span>
            ))}
          </div>
          {t.key === "associate" && (
            <p className="mt-5 text-[13.5px] text-gray-500">
              Associate builds on all of it. Want even more?{" "}
              <Link href="/membership/premium" className="font-semibold" style={{ color: "var(--accent-ink)" }}>See Premium →</Link>
            </p>
          )}
          {t.key !== "associate" && (
            <p className="mt-5 text-[13.5px] text-gray-500">
              {t.key === "premium" ? (
                <>Ready to make it permanent? <Link href="/membership/life" className="font-semibold text-[#a76a00]">Become a Life Member →</Link></>
              ) : (
                <>Not ready for lifetime? <Link href="/membership/premium" className="font-semibold text-[#1a7f49]">Premium is ₹999/year →</Link></>
              )}
            </p>
          )}
        </div>
      </section>

      {/* ── Where it goes ────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1080px] px-5">
          <div className="mx-auto mb-12 max-w-[44ch] text-center">
            <h2 className="text-[30px] font-extrabold tracking-tight sm:text-[36px]">Where your {rupees(t.priceInr)} goes</h2>
            <p className="mt-3 text-[15px] text-gray-600">A contribution to NNAWCA — pooled to serve JNV Nagpur students and alumni.</p>
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

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[760px] px-5 py-16 sm:py-20">
        <h2 className="mb-8 text-center text-[30px] font-extrabold tracking-tight sm:text-[36px]">Questions, answered</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-semibold text-gray-900">{f.q}</span>
                  <ChevronDown className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <p className="border-t border-gray-100 px-5 py-4 text-[14.5px] leading-relaxed text-gray-600">{f.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="px-5 pb-20">
        <div
          className="mx-auto max-w-[1080px] overflow-hidden rounded-[32px] px-6 py-14 text-center sm:py-16"
          style={{ background: `linear-gradient(160deg, var(--accent), var(--accent-ink))` }}
        >
          <h2 className="mx-auto max-w-[20ch] text-balance text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]" style={{ color: "var(--on-accent)" }}>
            Join the contributors of NNAWCA
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15px]" style={{ color: "var(--on-accent)", opacity: 0.85 }}>
            {t.name} · {rupees(t.priceInr)} {t.per}. Two minutes to join.
          </p>
          <Link
            href={`/upgrade/${t.key}`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-[15px] font-bold shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ color: "var(--accent-ink)" }}
          >
            {t.cta} <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-5 text-[12.5px]" style={{ color: "var(--on-accent)", opacity: 0.75 }}>
            A non-refundable contribution to the Nagpur Navodaya Alumni Welfare &amp; Charitable Association.
          </p>
        </div>
      </section>
    </div>
  )
}
