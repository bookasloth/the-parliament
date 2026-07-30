import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import {
  Section,
  SectionHeading,
  Eyebrow,
  Reveal,
  CtaBand,
  ACCENT_HEX,
} from "@/components/marketing/primitives"
import { EXECUTIVE, SUB_COMMITTEES } from "@/lib/committee"
import { MemberCard } from "@/components/marketing/MemberCard"

export const metadata: Metadata = {
  title: "Committee — the alumni who run NNAWCA",
  description:
    "The NNAWCA Executive Committee and its four sub-committees — Tech & Media, Culture, Alumni Relations and Election — and how to reach them.",
}

export default function CommitteePage() {
  return (
    <>
      {/* ── Hero ── */}
      <Section width="6xl" className="pt-32 lg:pt-40">
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>Our committee</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              The alumni who keep the family running.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-[#5b5b5b]">
              An 11-member Executive Committee, elected by members, steers NNAWCA — backed
              by four sub-committees that carry the day-to-day work. Every one of them is a
              JNV Nagpur alumnus giving their own time. Reach any of them directly below.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-[#5b5b5b]">
              <ShieldCheck className="h-4 w-4 text-[#70ad47]" />
              Elected roster · verified alumni
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Executive Committee ── */}
      <Section width="7xl" className="pt-0">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-2xl font-semibold text-[#1a1a1a]">
            Executive Committee
          </h2>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand">
            11 members
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-[15px] text-[#8a8a8a]">
          The elected office-bearers who hold NNAWCA's mandate and represent the alumni body.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXECUTIVE.map((m, i) => (
            <Reveal key={m.position + i} delay={(i % 3) * 0.06}>
              <MemberCard member={m} accent={(i % 4) as 0 | 1 | 2 | 3} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Sub-committees (2×2) ── */}
      <Section width="7xl" className="bg-[#f4f1ea]">
        <SectionHeading
          eyebrow="Sub-committees"
          accent={1}
          title="Four teams, three members each."
          sub="Focused groups that carry the work between meetings — from the platform and comms to culture, member outreach and elections."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {SUB_COMMITTEES.map((sc, i) => (
            <Reveal key={sc.name} delay={(i % 2) * 0.08}>
              <div className="h-full rounded-3xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: ACCENT_HEX[sc.accent] }}
                  />
                  <h3 className="font-heading text-lg font-semibold text-[#1a1a1a]">
                    {sc.name}
                  </h3>
                  <span className="ml-auto text-xs font-medium uppercase tracking-wide text-[#a3a3a3]">
                    {sc.members.length} members
                  </span>
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
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="Want to help run it?"
        sub="Committee seats are elected from the membership. Join as a member, get involved, and stand for a role."
        primary={{ label: "Become a member", href: "/join" }}
        secondary={{ label: "Contact the committee", href: "/contact" }}
      />
    </>
  )
}
