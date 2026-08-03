import type { Metadata } from "next"
import { Fragment } from "react"
import { Check, Minus, Users, Handshake, Trophy } from "lucide-react"
import {
  Section,
  SectionHeading,
  Eyebrow,
  Reveal,
  CtaBand,
  ACCENT_HEX,
  ACCENT_TEXT,
} from "@/components/marketing/primitives"
import { FaqAccordion } from "@/components/marketing/FaqAccordion"

export const metadata: Metadata = {
  title: "Membership — join the NNAWCA alumni network",
  description:
    "Free for students, ₹499 Associate, ₹999 Premium, ₹9,999 Life. Verified profile, directory, events, mentorship and a vote in the association.",
}

const WHY = [
  {
    icon: Users,
    title: "Find your people",
    body: "A verified directory of JNV Nagpur alumni — search by batch, house, city or company, and reconnect.",
  },
  {
    icon: Handshake,
    title: "Open doors",
    body: "Referrals, mentorship and introductions, alumni-to-alumni. The network works when you're in it.",
  },
  {
    icon: Trophy,
    title: "Give back",
    body: "Your membership funds scholarships and campus support for the students walking the halls we did.",
  },
]

interface Tier {
  name: string
  price: string
  cadence: string
  tagline: string
  accent: 0 | 1 | 2 | 3
  featured?: boolean
  cta: string
  perks: string[]
}

const TIERS: Tier[] = [
  {
    name: "Student",
    price: "₹0",
    cadence: "free forever",
    tagline: "For current students & recent grads (within 5 years).",
    accent: 3,
    cta: "Sign up free",
    perks: [
      "Verified alumni profile",
      "Browse the alumni directory",
      "Feed, groups & announcements",
      "Reconnect with your batch",
    ],
  },
  {
    name: "Associate",
    price: "₹499",
    cadence: "per year",
    tagline: "Stay connected, give back, grow with the network.",
    accent: 0,
    cta: "Become an Associate",
    perks: [
      "Everything in Student",
      "Full directory search & connect",
      "List your business",
      "RSVP to all events",
      "Mentorship matching",
    ],
  },
  {
    name: "Premium",
    price: "₹999",
    cadence: "per year",
    tagline: "Lead, mentor and shape NNAWCA.",
    accent: 1,
    featured: true,
    cta: "Go Premium",
    perks: [
      "Everything in Associate",
      "Priority access + event discounts",
      "Host groups & events",
      "Vote in association matters",
      "Premium profile badge",
    ],
  },
  {
    name: "Life",
    price: "₹9,999",
    cadence: "one-time · never renews",
    tagline: "A lifetime contribution that never lapses.",
    accent: 2,
    cta: "Become a Life Member",
    perks: [
      "Everything in Premium, for life",
      "Founding-supporter recognition",
      "Wall of Honour eligibility",
      "Lifetime badge",
    ],
  },
]

interface Row {
  label: string
  // Student, Associate, Premium, Life — true=check, false=dash, or a string
  cells: (boolean | string)[]
}
const COMPARE: { group: string; rows: Row[] }[] = [
  {
    group: "Access",
    rows: [
      { label: "Verified alumni profile", cells: [true, true, true, true] },
      { label: "Alumni directory", cells: ["Browse", "Search + connect", "Search + connect", "Search + connect"] },
      { label: "Business directory listing", cells: [false, true, true, true] },
    ],
  },
  {
    group: "Community",
    rows: [
      { label: "Feed, groups & announcements", cells: [true, true, true, true] },
      { label: "Member-only groups", cells: [false, true, true, true] },
      { label: "Host groups & events", cells: [false, false, true, true] },
      { label: "Mentorship matching", cells: [false, true, true, true] },
    ],
  },
  {
    group: "Events",
    rows: [
      { label: "RSVP to events", cells: ["Selected", true, true, true] },
      { label: "Priority access + discounts", cells: [false, false, true, true] },
    ],
  },
  {
    group: "Recognition & governance",
    rows: [
      { label: "Profile badge", cells: [false, "Associate", "Premium", "Life"] },
      { label: "Vote in association matters", cells: [false, false, true, true] },
      { label: "Wall of Honour eligibility", cells: [false, false, false, true] },
    ],
  },
]

const FAQ = [
  {
    q: "Who can join?",
    a: "Any alumnus of JNV Nagpur (Navegaon Khairi / Jindi). Current students and anyone who passed out within the last five years get Student membership free.",
  },
  {
    q: "How do I pay?",
    a: "Securely through Razorpay — UPI, cards or netbanking. Associate and Premium renew yearly; Life is a single one-time payment that never renews.",
  },
  {
    q: "Can I upgrade later?",
    a: "Yes. Start free and move up any time — Student → Associate → Premium → Life. You only pay the difference when upgrading mid-cycle.",
  },
  {
    q: "Is Student really free?",
    a: "Permanently. No card, no trial, no renewal. It's how we keep every alumnus connected regardless of means.",
  },
  {
    q: "What about the Committee tier?",
    a: "Committee Membership is invite-only — Life Members are invited to serve a three-year tenure. It isn't something you purchase.",
  },
]

function Cell({ value, accent }: { value: boolean | string; accent: 0 | 1 | 2 | 3 }) {
  if (value === true)
    return <Check className="mx-auto h-5 w-5" style={{ color: ACCENT_HEX[accent] }} />
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-[#cbcbcb]" />
  return <span className="text-xs font-medium text-[#5b5b5b]">{value}</span>
}

export default function JoinPage() {
  return (
    <>
      {/* ── Hero ── */}
      <Section width="6xl" className="pt-32 lg:pt-40 text-center">
        <Reveal>
          <Eyebrow className="justify-center">Membership</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-5 max-w-4xl font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            One family. Four ways to belong.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#5b5b5b]">
            Free to start, and every paid tier gives back to the school. Pick the one that
            fits where you are — you can always move up later.
          </p>
        </Reveal>
      </Section>

      {/* ── Why join ── */}
      <Section width="6xl" className="pt-0">
        <div className="grid gap-6 md:grid-cols-3">
          {WHY.map((w, i) => {
            const Icon = w.icon
            return (
              <Reveal key={w.title} delay={i * 0.08}>
                <div
                  className="group h-full rounded-2xl border p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_-18px_rgba(26,26,26,0.22)]"
                  style={{ backgroundColor: `${ACCENT_HEX[i]}0a`, borderColor: `${ACCENT_HEX[i]}22` }}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition group-hover:scale-105"
                    style={{ backgroundColor: `${ACCENT_HEX[i]}1f`, color: ACCENT_HEX[i], boxShadow: `inset 0 0 0 1px ${ACCENT_HEX[i]}33` }}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 font-heading text-xl font-semibold text-[#1a1a1a]">
                    {w.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5b5b5b]">{w.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* ── Tier cards ── */}
      <Section width="7xl" className="bg-[#f4f1ea]">
        <SectionHeading
          center
          eyebrow="Choose your tier"
          title="Simple pricing. Every rupee gives back."
          sub="No hidden fees. Paid tiers fund scholarships and campus support."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.07}>
              <div
                className={`tier-card group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white p-7 transition duration-300 hover:-translate-y-1.5 ${
                  t.featured
                    ? "shadow-[0_24px_60px_-24px_rgba(26,26,26,0.28)] ring-2 lg:scale-[1.04] hover:shadow-[0_32px_70px_-28px_rgba(26,26,26,0.36)]"
                    : "border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_22px_50px_-22px_rgba(26,26,26,0.24)]"
                }`}
                style={{ ["--accent" as string]: ACCENT_HEX[t.accent], ...(t.featured ? { ["--tw-ring-color" as string]: ACCENT_HEX[t.accent] } : {}) }}
              >
                {/* Accent top bar */}
                <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: ACCENT_HEX[t.accent] }} />
                {t.featured && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: ACCENT_HEX[t.accent] }}
                  >
                    Most popular
                  </span>
                )}
                <h3 className={`mt-1 font-heading text-lg font-semibold ${ACCENT_TEXT[t.accent]}`}>
                  {t.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-heading text-4xl font-semibold text-[#1a1a1a]">
                    {t.price}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#a3a3a3]">
                  {t.cadence}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#5b5b5b]">{t.tagline}</p>
                <a
                  href="/auth/signup"
                  className="tier-cta mt-6 rounded-full border px-5 py-3 text-center text-sm font-semibold transition duration-200 hover:-translate-y-0.5"
                  style={{
                    color: t.featured ? "#fff" : ACCENT_HEX[t.accent],
                    backgroundColor: t.featured ? ACCENT_HEX[t.accent] : "transparent",
                    borderColor: ACCENT_HEX[t.accent] + (t.featured ? "" : "55"),
                  }}
                >
                  {t.cta}
                </a>
                <ul className="mt-6 space-y-2.5 border-t border-black/5 pt-6">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-[#3a3a3a]">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: ACCENT_HEX[t.accent] }}
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-[#a3a3a3]">
          Prices in INR. Committee Membership is invite-only and not purchasable.
        </p>
      </Section>

      {/* ── Compare table ── */}
      <Section width="6xl">
        <SectionHeading
          center
          eyebrow="Compare every benefit"
          accent={0}
          title="Everything, side by side."
        />
        <Reveal delay={0.1}>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="py-4 pr-4 text-sm font-semibold text-[#1a1a1a]">Benefit</th>
                  {["Student", "Associate", "Premium", "Life"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-4 text-center text-sm font-semibold ${ACCENT_TEXT[[3, 0, 1, 2][i] as 0 | 1 | 2 | 3]}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((grp) => (
                  <Fragment key={grp.group}>
                    <tr>
                      <td
                        colSpan={5}
                        className="pt-7 pb-2 text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]"
                      >
                        {grp.group}
                      </td>
                    </tr>
                    {grp.rows.map((r) => (
                      <tr key={r.label} className="border-b border-black/5">
                        <td className="py-3 pr-4 text-sm text-[#3a3a3a]">{r.label}</td>
                        {r.cells.map((c, i) => (
                          <td key={i} className="px-3 py-3 text-center">
                            <Cell value={c} accent={[3, 0, 1, 2][i] as 0 | 1 | 2 | 3} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </Section>

      {/* ── FAQ ── */}
      <Section width="5xl" className="bg-[#f4f1ea]">
        <SectionHeading center eyebrow="Questions" accent={2} title="Answered." />
        <FaqAccordion items={FAQ} />
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="Start free. Belong for life."
        sub="Create your profile in a minute — upgrade whenever you're ready."
        primary={{ label: "Sign up free", href: "/auth/signup" }}
        secondary={{ label: "Questions? Contact us", href: "/contact" }}
      />
    </>
  )
}
