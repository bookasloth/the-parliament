import type { Metadata } from "next"
import {
  Users,
  Heart,
  Globe2,
  GraduationCap,
  HandHeart,
  Sparkles,
  CalendarHeart,
} from "lucide-react"
import {
  Section,
  SectionHeading,
  Eyebrow,
  Reveal,
  CountUp,
  GlassCard,
  CtaBand,
  Typewriter,
  ACCENT_TEXT,
  ACCENT_HEX,
} from "@/components/marketing/primitives"
import { EXECUTIVE, SUB_COMMITTEES } from "@/lib/committee"
import { MemberCard } from "@/components/marketing/MemberCard"

export const metadata: Metadata = {
  title: "About NNAWCA — the JNV Nagpur alumni family",
  description:
    "Nagpur Navodaya Alumni Welfare and Charitable Association connects JNV Nagpur alumni worldwide — to give back, stay close, and lift the next batch.",
}

const PILLARS = [
  {
    icon: Globe2,
    title: "Connect",
    body: "One network for every batch, house and city — from Nagpur to New York. Find your people again.",
  },
  {
    icon: HandHeart,
    title: "Give back",
    body: "Scholarships, mentoring and campus support that reach the students walking the halls we did.",
  },
  {
    icon: GraduationCap,
    title: "Grow",
    body: "Referrals, guidance and opportunities shared alumni-to-alumni — because Navodaya opens doors.",
  },
]

const STATS = [
  { icon: Users, to: 1200, suffix: "+", label: "Alumni connected", accent: 0 as const },
  { icon: CalendarHeart, to: 48, suffix: "", label: "Events & reunions", accent: 1 as const },
  { icon: GraduationCap, to: 60, suffix: "+", label: "Students supported", accent: 2 as const },
  { icon: Heart, to: 15, suffix: "+", label: "Years of the bond", accent: 3 as const },
]

const VALUES = [
  {
    title: "The bond outlives the campus.",
    body: "Navodaya made us a family for life. This is where that family stays in reach.",
  },
  {
    title: "Give more than you take.",
    body: "Every senior was once helped up. We pay it forward to the batch behind us.",
  },
  {
    title: "Real names, real people.",
    body: "No pseudonyms. A trusted network is built on knowing exactly who you're talking to.",
  },
  {
    title: "Distance is not a barrier.",
    body: "Across states and time zones, one link keeps the whole family a message away.",
  },
]

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ── */}
      <Section width="7xl" className="pt-32 lg:pt-40">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Reveal>
              <Eyebrow>About NNAWCA</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.04]">
                Built by alumni who'd rather{" "}
                <Typewriter words={["give back", "stay close", "lift others", "build together"]} />
                <br className="hidden sm:block" /> than lose touch.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#5b5b5b]">
                The Nagpur Navodaya Alumni Welfare and Charitable Association is the
                home for every JNV Nagpur alumnus — a place to reconnect, give back,
                and open doors for the students who come after us.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="/join"
                  className="rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Become a member
                </a>
                <a
                  href="/committee"
                  className="rounded-full border border-black/10 bg-white px-7 py-3.5 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/20"
                >
                  Meet the committee
                </a>
              </div>
            </Reveal>
          </div>

          {/* Floating mockup cluster */}
          <Reveal delay={0.2} className="relative hidden lg:block">
            <GlassCard className="ml-auto max-w-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">New member joined</p>
                  <p className="text-xs text-[#8a8a8a]">Batch of 2014 · Pune</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="mt-5 mr-auto max-w-xs">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Scholarship funded
              </p>
              <p className="mt-1 font-heading text-2xl font-semibold text-[#1a1a1a]">
                ₹25,000
              </p>
              <p className="text-xs text-[#8a8a8a]">for a Class XII student · this month</p>
            </GlassCard>
            <GlassCard className="mt-5 ml-auto max-w-[15rem]">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#e8503a]" />
                <p className="text-sm font-medium text-[#1a1a1a]">Reunion 2026 — 240 going</p>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      {/* ── Pillars ── */}
      <Section width="6xl">
        <SectionHeading
          center
          eyebrow="Why we exist"
          title="One family. Three promises."
          sub="Everything NNAWCA does comes back to these — connect the network, give back to the school, and grow together."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-black/5 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_32px_-12px_rgba(26,26,26,0.18)]">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${ACCENT_HEX[i]}1a`, color: ACCENT_HEX[i] }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-heading text-xl font-semibold text-[#1a1a1a]">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5b5b5b]">{p.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* ── Impact stats (dark band, 4 stats w/ line icons) ── */}
      <Section dark width="7xl" className="text-center">
        <Reveal>
          <Eyebrow accent={2}>The family, in numbers</Eyebrow>
        </Reveal>
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => {
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
                  <p
                    className={`mt-5 font-heading text-5xl font-semibold lg:text-6xl ${ACCENT_TEXT[s.accent]}`}
                  >
                    <CountUp to={s.to} suffix={s.suffix} />
                  </p>
                  <span
                    className="mt-3 block h-0.5 w-8 rounded-full"
                    style={{ backgroundColor: ACCENT_HEX[s.accent] }}
                  />
                  <p className="mt-3 text-sm font-medium uppercase tracking-wide text-white/60">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* ── Committee: Executive (11) + 4 sub-committees (2×2) ── */}
      <Section width="7xl">
        <SectionHeading
          eyebrow="The people behind it"
          accent={3}
          title="A committee that runs on volunteered evenings."
          sub="An 11-member Executive Committee, backed by four focused sub-committees — alumni who give their time so the network keeps working for everyone else."
        />

        {/* Executive */}
        <div className="mt-14">
          <div className="flex items-center gap-3">
            <h3 className="font-heading text-xl font-semibold text-[#1a1a1a]">
              Executive Committee
            </h3>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand">
              11 members
            </span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXECUTIVE.map((m, i) => (
              <Reveal key={m.position + i} delay={(i % 3) * 0.06}>
                <MemberCard member={m} accent={(i % 4) as 0 | 1 | 2 | 3} />
              </Reveal>
            ))}
          </div>
        </div>

        {/* Sub-committees 2×2 */}
        <div className="mt-16">
          <h3 className="font-heading text-xl font-semibold text-[#1a1a1a]">Sub-committees</h3>
          <p className="mt-1 text-[15px] text-[#8a8a8a]">Three members each, led by a Head.</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {SUB_COMMITTEES.map((sc, i) => (
              <Reveal key={sc.name} delay={(i % 2) * 0.08}>
                <div className="h-full rounded-3xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: ACCENT_HEX[sc.accent] }}
                    />
                    <h4 className="font-heading text-lg font-semibold text-[#1a1a1a]">
                      {sc.name}
                    </h4>
                  </div>
                  <div className="mt-5 space-y-3">
                    {sc.members.map((m, j) => (
                      <MemberCard key={m.position + j} member={m} accent={sc.accent} />
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.2}>
          <div className="mt-12 text-center">
            <a
              href="/committee"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/20"
            >
              See the full committee
            </a>
          </div>
        </Reveal>
      </Section>

      {/* ── Values ── */}
      <Section width="6xl" className="bg-[#f4f1ea]">
        <SectionHeading
          eyebrow="What we believe"
          accent={1}
          title="Four things we don't compromise on."
        />
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={(i % 2) * 0.08}>
              <div className="flex gap-4">
                <Sparkles className={`mt-1 h-5 w-5 shrink-0 ${ACCENT_TEXT[i % 4]}`} />
                <div>
                  <h3 className="font-heading text-lg font-semibold text-[#1a1a1a]">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[#5b5b5b]">{v.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="Your batch is already here."
        sub="Join the NNAWCA network — reconnect with your Navodaya family and help the next batch rise."
        primary={{ label: "Become a member", href: "/join" }}
        secondary={{ label: "Talk to us", href: "/contact" }}
      />
    </>
  )
}
