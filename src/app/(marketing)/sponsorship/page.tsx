import type { Metadata } from "next"
import { Users, Target, Megaphone, Check, Handshake } from "lucide-react"
import {
  Section,
  SectionHeading,
  Eyebrow,
  Reveal,
  CtaBand,
  CountUp,
  ACCENT_HEX,
  ACCENT_TEXT,
} from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Sponsorship — partner with the NNAWCA alumni network",
  description:
    "Reach an engaged network of accomplished JNV Nagpur alumni. Sponsor events, scholarships and the platform — and support a charitable cause.",
}

const REACH = [
  { icon: Users, to: 1200, suffix: "+", label: "Verified alumni", accent: 0 as const },
  { icon: Target, to: 40, suffix: "+", label: "Companies represented", accent: 1 as const },
  { icon: Megaphone, to: 48, suffix: "", label: "Events a year", accent: 3 as const },
]

interface Pkg {
  name: string
  amount: string
  accent: 0 | 1 | 2 | 3
  featured?: boolean
  perks: string[]
}
const PACKAGES: Pkg[] = [
  {
    name: "Community Partner",
    amount: "₹{{amount}}",
    accent: 3,
    perks: ["Logo on the sponsors page", "Mention in one event", "Social media shout-out"],
  },
  {
    name: "Event Partner",
    amount: "₹{{amount}}",
    accent: 0,
    featured: true,
    perks: [
      "Everything in Community",
      "Branding at a flagship event",
      "Stall / speaking slot",
      "Newsletter feature",
    ],
  },
  {
    name: "Title Sponsor",
    amount: "₹{{amount}}",
    accent: 2,
    perks: [
      "Everything in Event",
      "Naming rights for a reunion or programme",
      "Year-round platform branding",
      "Dedicated alumni outreach",
    ],
  },
]

const WHY = [
  "An engaged, high-trust audience of accomplished professionals across India and abroad.",
  "Association with a genuine charitable cause — scholarships and student welfare.",
  "Targeted reach by batch, city, company or profession.",
  "Long-term goodwill with a community that remembers who backed it.",
]

export default function SponsorshipPage() {
  return (
    <>
      {/* ── Hero ── */}
      <Section width="6xl" className="pt-32 pb-10 lg:pt-40 lg:pb-16">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <Eyebrow accent={1}>Sponsorship</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
                Back a community that gives back.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#5b5b5b]">
                Partner with NNAWCA to reach an engaged network of JNV Nagpur alumni — while your
                support funds scholarships and campus initiatives. Good for your brand, better for a
                student's future.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <a
                href="/contact"
                className="mt-9 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <Handshake className="h-4 w-4" /> Talk to the committee
              </a>
            </Reveal>
          </div>

          {/* Sponsor spotlight — fills the space, previews the value */}
          <Reveal delay={0.2} className="hidden lg:block">
            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_20px_60px_-24px_rgba(26,26,26,0.25)]">
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-[#f4f1ea] text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Presented by</p>
                <p className="mt-1.5 font-heading text-2xl font-semibold text-[#1a1a1a]">Your Brand</p>
                <p className="mt-1 text-xs text-[#8a8a8a]">at NNAWCA Annual Reunion 2026</p>
              </div>
              <div className="mt-5 grid grid-cols-3 divide-x divide-black/5 text-center">
                {[["1,200+", "alumni"], ["40+", "companies"], ["48", "events/yr"]].map(([n, l]) => (
                  <div key={l} className="px-2">
                    <p className="font-heading text-xl font-semibold text-[#1a1a1a]">{n}</p>
                    <p className="text-[11px] uppercase tracking-wide text-[#8a8a8a]">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Reach stats ── */}
      <Section dark width="6xl" className="relative rounded-t-[2.5rem] text-center lg:rounded-t-[3rem]">
        <Reveal>
          <Eyebrow accent={2}>Your reach</Eyebrow>
        </Reveal>
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {REACH.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.label} delay={i * 0.1}>
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border"
                    style={{
                      color: ACCENT_HEX[s.accent],
                      borderColor: `${ACCENT_HEX[s.accent]}55`,
                      backgroundColor: `${ACCENT_HEX[s.accent]}14`,
                    }}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                  <p className={`mt-5 font-heading text-5xl font-semibold ${ACCENT_TEXT[s.accent]}`}>
                    <CountUp to={s.to} suffix={s.suffix} />
                  </p>
                  <p className="mt-3 text-sm font-medium uppercase tracking-wide text-white/60">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* ── Why sponsor ── */}
      <Section width="6xl">
        <SectionHeading
          eyebrow="Why partner with us"
          title="More than a logo placement."
        />
        <div className="mt-10 grid gap-x-12 gap-y-6 sm:grid-cols-2">
          {WHY.map((w, i) => (
            <Reveal key={w} delay={(i % 2) * 0.08}>
              <div className="flex gap-3">
                <Check className={`mt-0.5 h-5 w-5 shrink-0 ${ACCENT_TEXT[i % 4]}`} />
                <p className="text-[15px] leading-relaxed text-[#4a4a4a]">{w}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Packages ── */}
      <Section width="7xl" className="bg-[#f4f1ea]">
        <SectionHeading
          center
          eyebrow="Packages"
          accent={0}
          title="Pick a partnership that fits."
          sub="Custom packages welcome — tell us your goals and we'll shape one with you."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PACKAGES.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <div
                className={`relative flex h-full flex-col rounded-3xl bg-white p-7 ${
                  p.featured
                    ? "shadow-[0_24px_60px_-24px_rgba(26,26,26,0.28)] ring-2"
                    : "border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                }`}
                style={p.featured ? { ["--tw-ring-color" as string]: ACCENT_HEX[p.accent] } : undefined}
              >
                {p.featured && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: ACCENT_HEX[p.accent] }}
                  >
                    Most chosen
                  </span>
                )}
                <h3 className={`font-heading text-lg font-semibold ${ACCENT_TEXT[p.accent]}`}>
                  {p.name}
                </h3>
                <p className="mt-3 font-heading text-3xl font-semibold text-[#1a1a1a]">
                  {p.amount}
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-black/5 pt-6">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-sm text-[#3a3a3a]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT_HEX[p.accent] }} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <a
                  href="/contact"
                  className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                    p.featured ? "text-white hover:opacity-90" : "border border-black/10 text-[#1a1a1a] hover:border-black/20"
                  }`}
                  style={p.featured ? { backgroundColor: ACCENT_HEX[p.accent] } : undefined}
                >
                  Enquire
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="Let's build something worth remembering."
        sub="Tell us your goals and budget — we'll come back with a partnership that works."
        primary={{ label: "Start a conversation", href: "/contact" }}
      />
    </>
  )
}
