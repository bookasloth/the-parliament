import type { Metadata } from "next"
import {
  Users,
  Heart,
  Globe2,
  GraduationCap,
  HandHeart,
  Sparkles,
  CalendarHeart,
  Eye,
  Check,
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
import { getPublicRoster, type RosterMemberDTO } from "@/modules/committee/roster"
import type { Member } from "@/lib/committee"
import { CommitteeTabs } from "@/components/marketing/CommitteeTabs"

const toMember = (m: RosterMemberDTO): Member => ({
  name: m.name, position: m.position,
  photo: m.photo ?? undefined, profileLink: m.profileLink ?? undefined,
  email: m.email ?? undefined, phone: m.phone ?? undefined,
})

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

const OBJECTIVES = [
  "Build and maintain a verified, lifelong network of every JNV Nagpur alumnus.",
  "Fund scholarships and campus support for current Navodaya students.",
  "Enable mentorship, referrals and career guidance, alumni-to-alumni.",
  "Organise reunions, chapter meets and community events across cities.",
  "Champion alumni-run businesses, initiatives and ideas.",
  "Run welfare and charitable drives in the true Navodaya spirit.",
]

// Alumni faces for the hero collage (Unsplash portraits, cropped square/portrait).
const ALUMNI_COLLAGE = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=520&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=520&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=faces",
]

export default async function AboutPage() {
  const roster = await getPublicRoster()
  const executive = roster.executive.map(toMember)
  const advisory = roster.advisory.map(toMember)
  return (
    <>
      {/* ── Hero (compact) ── */}
      <Section width="7xl" className="pt-24 pb-10 lg:pt-28">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div>
            <Reveal>
              <Eyebrow>About NNAWCA</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-4xl lg:text-5xl lg:leading-[1.05]">
                Built by alumni who'd rather{" "}
                <Typewriter words={["give back", "stay close", "lift others", "build together"]} />
                <br className="hidden sm:block" /> than lose touch.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#5b5b5b]">
                The Nagpur Navodaya Alumni Welfare and Charitable Association is the
                home for every JNV Nagpur alumnus — a place to reconnect, give back,
                and open doors for the students who come after us.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/join"
                  className="rounded-[3px] bg-brand px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Become a member
                </a>
                <a
                  href="/committee"
                  className="rounded-[3px] border border-black/10 bg-white px-7 py-3.5 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/20"
                >
                  Meet the committee
                </a>
              </div>
            </Reveal>
          </div>

          {/* Alumni collage — the family, in faces */}
          <Reveal delay={0.2} className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                {ALUMNI_COLLAGE.slice(0, 3).map((url, i) => (
                  <div
                    key={i}
                    className="w-full overflow-hidden rounded-[5px] bg-cover bg-center shadow-[0_12px_40px_-16px_rgba(26,26,26,0.35)]"
                    style={{ backgroundImage: `url(${url})`, aspectRatio: i === 1 ? "3/4" : "1/1" }}
                  />
                ))}
              </div>
              <div className="space-y-4 pt-10">
                {ALUMNI_COLLAGE.slice(3).map((url, i) => (
                  <div
                    key={i}
                    className="w-full overflow-hidden rounded-[5px] bg-cover bg-center shadow-[0_12px_40px_-16px_rgba(26,26,26,0.35)]"
                    style={{ backgroundImage: `url(${url})`, aspectRatio: i === 0 ? "3/4" : "1/1" }}
                  />
                ))}
              </div>
            </div>
            {/* One warm stat chip overlaid, not a stack of cards */}
            <GlassCard className="absolute -bottom-5 left-1/2 w-max -translate-x-1/2 !px-5 !py-3">
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-brand" />
                <p className="text-sm font-semibold text-[#1a1a1a]">
                  1,200+ Navodayans, one family
                </p>
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
                <div className="h-full rounded-[5px] border border-black/5 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_32px_-12px_rgba(26,26,26,0.18)]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[5px] bg-brand/10 ring-1 ring-brand/15 text-brand">
                    <Icon className="h-7 w-7" strokeWidth={1.75} />
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

      {/* ── Vision & Objectives ── */}
      <Section width="6xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Vision */}
          <Reveal>
            <div className="rounded-[5px] bg-brand p-8 text-white sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-white/15">
                <Eye className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Our vision
              </p>
              <p className="mt-4 font-heading text-2xl font-semibold leading-snug tracking-[-0.02em] sm:text-[26px]">
                A JNV Nagpur family no member ever ages out of — where every
                Navodayan can find their people, give back to the school that
                shaped them, and lift the batch that follows.
              </p>
            </div>
          </Reveal>

          {/* Objectives */}
          <Reveal delay={0.08}>
            <div>
              <Eyebrow accent={2}>Our objectives</Eyebrow>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.03em] text-[#1a1a1a] sm:text-4xl">
                What we set out to do.
              </h2>
              <ul className="mt-8 space-y-4">
                {OBJECTIVES.map((o, i) => (
                  <li key={i} className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="text-[15px] leading-relaxed text-[#3f3f3f]">{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
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
                <div className="flex flex-col items-center rounded-[5px] border border-white/10 bg-white/[0.03] px-4 py-8 transition hover:bg-white/[0.05]">
                  {/* Label first */}
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/55">
                    {s.label}
                  </p>
                  {/* Value — the focal point */}
                  <p className={`mt-3 font-heading text-5xl font-semibold lg:text-6xl ${ACCENT_TEXT[s.accent]}`}>
                    <CountUp to={s.to} suffix={s.suffix} />
                  </p>
                  {/* Supporting icon — subtle accent below */}
                  <Icon
                    className="mt-4 h-5 w-5 opacity-50"
                    strokeWidth={1.75}
                    style={{ color: ACCENT_HEX[s.accent] }}
                  />
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* ── Committee: Executive + Advisory (tabbed) ── */}
      <Section width="7xl">
        <SectionHeading
          eyebrow="The people behind it"
          accent={3}
          title="A committee that runs on volunteered evenings."
          sub="An elected Executive Committee, guided by an Advisory Committee of past office-bearers — alumni who give their time so the network keeps working for everyone else."
        />

        {/* Tab-based committee browser (Executive / Advisory) */}
        <div className="mt-14">
          <CommitteeTabs executive={executive} advisory={advisory} />
        </div>
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
