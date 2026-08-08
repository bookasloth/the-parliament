import type { Metadata } from "next"
import { GraduationCap, Building2, HeartHandshake, PartyPopper, Landmark, Smartphone, ReceiptText, Target, Wallet } from "lucide-react"
import {
  Section,
  SectionHeading,
  Eyebrow,
  Reveal,
  CtaBand,
  ACCENT_HEX,
} from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Donate — fund a Navodaya student's future",
  description:
    "Support JNV Nagpur students and alumni through NNAWCA — scholarships, campus support and emergency aid. UPI, card or bank transfer, with 80G receipts.",
}

const CAUSES = [
  {
    icon: GraduationCap,
    title: "Scholarships",
    body: "Direct support for meritorious students who need a hand to stay in school and reach college.",
    accent: 0 as const,
  },
  {
    icon: Building2,
    title: "Campus support",
    body: "Books, labs, sports gear and facilities for the school that shaped every one of us.",
    accent: 1 as const,
  },
  {
    icon: HeartHandshake,
    title: "Alumni in need",
    body: "A quiet emergency fund for alumni families facing a genuine crisis.",
    accent: 3 as const,
  },
  {
    icon: PartyPopper,
    title: "Events & reunions",
    body: "Keep reunions, meetups and the annual gathering accessible to every batch.",
    accent: 2 as const,
  },
]

const STEPS = [
  {
    icon: Target,
    title: "Pick a cause",
    body: "Choose where your gift goes — or give to the general fund and let the committee direct it where it's needed most.",
  },
  {
    icon: Wallet,
    title: "Pay your way",
    body: "UPI, card or netbanking through Razorpay, or a direct bank transfer using the details below.",
  },
  {
    icon: ReceiptText,
    title: "Get your receipt",
    body: "An 80G-eligible receipt lands in your inbox automatically. Keep it for your tax filing.",
  },
]

// {{PLACEHOLDER}} — replace with the real NNAWCA bank + UPI details round-2.
const ACCOUNT = [
  { label: "Account Holder", value: "Nagpur Navodaya Alumni Welfare and Charitable Association" },
  { label: "Bank Name", value: "{{Bank name & branch}}" },
  { label: "Account Number", value: "{{Account number}}" },
  { label: "IFSC Code", value: "{{IFSC}}" },
  { label: "UPI Handle", value: "{{upi@bank}}" },
]

export default function DonatePage() {
  return (
    <>
      {/* ── Hero (full first viewport) ── */}
      <Section width="6xl" className="pt-32 lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:pt-24">
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow accent={1}>Donate</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Someone once helped you up. Pass it on.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-[#5b5b5b]">
              Every rupee you give goes to a Navodaya student's future, our campus, or an
              alumnus in a hard moment. No overheads skimmed — the committee volunteers its
              time so your gift reaches the ground.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#give"
                className="rounded-[3px] bg-brand px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Donate now
              </a>
              <a
                href="#causes"
                className="rounded-[3px] border border-black/10 bg-white px-7 py-3.5 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/20"
              >
                See where it goes
              </a>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Why give (dark band) ── */}
      <Section dark width="6xl" className="text-center">
        <Reveal>
          <p className="mx-auto max-w-3xl font-heading text-2xl font-medium leading-relaxed text-white sm:text-3xl">
            &ldquo;Navodaya took kids from villages and gave them the world. Giving back
            isn&rsquo;t charity — it&rsquo;s keeping that promise alive for the next child.&rdquo;
          </p>
        </Reveal>
      </Section>

      {/* ── Causes ── */}
      <Section id="causes" width="7xl">
        <SectionHeading
          center
          eyebrow="Where it goes"
          title="Four ways your gift works."
          sub="Give to a specific cause, or to the general fund and let the committee direct it."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CAUSES.map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={c.title} delay={i * 0.07}>
                <div className="h-full rounded-[5px] border border-black/5 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_32px_-12px_rgba(26,26,26,0.18)]">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[5px]"
                    style={{ backgroundColor: `${ACCENT_HEX[c.accent]}1a`, color: ACCENT_HEX[c.accent] }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-[#1a1a1a]">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5b5b5b]">{c.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* ── How to donate (steps) ── */}
      <Section id="give" width="6xl" className="bg-[#f4f1ea]">
        <SectionHeading
          eyebrow="How to give"
          accent={3}
          title="Three steps. Two minutes."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="group h-full rounded-[5px] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-18px_rgba(26,26,26,0.2)]">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-[5px] transition group-hover:scale-105"
                      style={{ backgroundColor: `${ACCENT_HEX[i % 4]}1a`, color: ACCENT_HEX[i % 4] }}
                    >
                      <Icon className="h-7 w-7" strokeWidth={1.75} />
                    </div>
                    <span className="font-heading text-3xl font-semibold text-black/[0.06]">{i + 1}</span>
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-[#1a1a1a]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5b5b5b]">{s.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* Give options: online + bank */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col rounded-[5px] border border-black/5 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[5px] bg-brand/10 text-brand">
                  <Smartphone className="h-5 w-5" />
                </span>
                <h3 className="font-heading text-xl font-semibold text-[#1a1a1a]">
                  Give online
                </h3>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b]">
                Fastest way — UPI, card or netbanking, secured by Razorpay. You get an instant
                receipt.
              </p>
              <a
                href="/auth/signup"
                className="mt-6 inline-flex w-fit rounded-[3px] bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Donate with Razorpay
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="flex h-full flex-col rounded-[5px] border border-black/5 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[5px] bg-[#e8503a]/10 text-[#e8503a]">
                  <Landmark className="h-5 w-5" />
                </span>
                <h3 className="font-heading text-xl font-semibold text-[#1a1a1a]">
                  Bank transfer
                </h3>
              </div>
              <dl className="mt-5 divide-y divide-black/5 rounded-[5px] border border-black/5 bg-[#faf9f6]">
                {ACCOUNT.map((a) => (
                  <div key={a.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <dt className="text-[13px] font-medium text-[#8a8a8a]">{a.label}</dt>
                    <dd className="font-heading text-[15px] font-semibold text-[#1a1a1a] sm:text-right">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>

        {/* 80G note */}
        <Reveal delay={0.1}>
          <div className="mt-6 flex items-start gap-3 rounded-[5px] border border-[#70ad47]/30 bg-[#eef6e8] p-5">
            <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-[#70ad47]" />
            <p className="text-sm leading-relaxed text-[#3a3a3a]">
              Donations to NNAWCA are eligible for tax deduction under Section 80G. Your
              receipt with the registration details is emailed automatically after every gift.
            </p>
          </div>
        </Reveal>
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="A small gift changes a Navodaya kid's year."
        sub="Give once, or set up a recurring contribution — every rupee reaches the ground."
        primary={{ label: "Donate now", href: "#give" }}
        secondary={{ label: "Talk to us first", href: "/contact" }}
      />
    </>
  )
}
