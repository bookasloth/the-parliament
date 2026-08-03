import type { Metadata } from "next"
import { FileText, Download, Scale, Landmark } from "lucide-react"
import {
  Section,
  SectionHeading,
  Eyebrow,
  Reveal,
  CtaBand,
} from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Governance — MOA & Rules of NNAWCA",
  description:
    "How the Nagpur Navodaya Alumni Welfare and Charitable Association is constituted and run — its Memorandum of Association and Rules & Regulations.",
}

const MOA_OBJECTS = [
  "Connect and support alumni of Jawahar Navodaya Vidyalaya, Nagpur, across the world.",
  "Advance the welfare of members and their families in times of genuine need.",
  "Fund scholarships and educational support for deserving students of the school.",
  "Support the school through infrastructure, mentoring and campus initiatives.",
  "Promote charitable, social and community activities in the spirit of Navodaya.",
  "Organise reunions, events and programmes that keep the alumni community engaged.",
]

const RULES = [
  {
    title: "Membership",
    body: "Open to alumni, students and staff of JNV Nagpur. Tiers — Student, Associate, Premium and Life — with a Committee tier by invitation. Real legal identity is required; pseudonyms are not permitted.",
  },
  {
    title: "The Executive Committee",
    body: "An 11-member Executive Committee, elected by the membership, holds the association's mandate. Office-bearers include the President, Vice President, Secretaries and Treasurers, supported by four sub-committees.",
  },
  {
    title: "Elections & tenure",
    body: "Committee members are elected for a defined tenure through a member vote overseen by the Election sub-committee. Vacancies are filled per the rules laid down in the Memorandum.",
  },
  {
    title: "Meetings",
    body: "The association holds an Annual General Meeting open to members, alongside regular committee meetings. Quorum, notice and voting procedures follow the registered rules.",
  },
  {
    title: "Finances",
    body: "Funds are held in the association's name and applied only to its stated objects. Accounts are maintained transparently and presented to members. Donations are directed to their designated causes.",
  },
  {
    title: "Amendments",
    body: "The Memorandum and Rules may be amended only by the process they prescribe, with member approval, in accordance with applicable law.",
  },
]

export default function GovernancePage() {
  return (
    <>
      {/* ── Hero ── */}
      <Section width="6xl" className="pt-32 lg:pt-40">
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>Governance</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Run openly, by the members, for the members.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-[#5b5b5b]">
              NNAWCA is a registered charitable association governed by two documents — its
              Memorandum of Association, which sets out what we exist to do, and its Rules &
              Regulations, which set out how we do it. Both are summarised here and available to
              download in full.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-7 flex flex-wrap gap-3 text-sm">
              <a href="/moa" className="rounded-full border border-black/10 bg-white px-5 py-2.5 font-semibold text-[#1a1a1a] transition hover:border-black/20">
                Read the Memorandum
              </a>
              <a href="/rules" className="rounded-full border border-black/10 bg-white px-5 py-2.5 font-semibold text-[#1a1a1a] transition hover:border-black/20">
                Read the Rules
              </a>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Registered entity ── */}
      <Section width="6xl" className="pt-0">
        <Reveal>
          <div className="grid gap-4 rounded-3xl border border-black/5 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:grid-cols-3">
            {[
              { label: "Legal entity", value: "Nagpur Navodaya Alumni Welfare and Charitable Association" },
              { label: "Registration no.", value: "{{Registration number}}" },
              { label: "Registered under", value: "{{Act & registering authority}}" },
            ].map((r) => (
              <div key={r.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#a3a3a3]">
                  {r.label}
                </p>
                <p className="mt-1 text-sm font-medium text-[#1a1a1a]">{r.value}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ── MOA ── */}
      <Section id="moa" width="6xl" className="bg-[#f4f1ea]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Landmark className="h-6 w-6" />
          </div>
          <SectionHeading
            eyebrow="The charter"
            title="Memorandum of Association"
            sub="Why NNAWCA exists — its objects and charitable purpose."
          />
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {MOA_OBJECTS.map((o, i) => (
            <Reveal key={o} delay={(i % 2) * 0.06}>
              <div className="flex gap-3 rounded-2xl border border-black/5 bg-white p-5">
                <span className="font-heading text-lg font-semibold text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[15px] leading-relaxed text-[#4a4a4a]">{o}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <a
            href="{{MOA_PDF_URL}}"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <Download className="h-4 w-4" /> Download the full Memorandum (PDF)
          </a>
        </Reveal>
      </Section>

      {/* ── Rules ── */}
      <Section id="rules" width="6xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8503a]/10 text-[#e8503a]">
            <Scale className="h-6 w-6" />
          </div>
          <SectionHeading
            eyebrow="The rulebook"
            accent={1}
            title="Rules & Regulations"
            sub="How the association is run — membership, committee, elections, meetings and finances."
          />
        </div>
        <div className="mt-10 space-y-4">
          {RULES.map((r, i) => (
            <Reveal key={r.title} delay={(i % 3) * 0.05}>
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <h3 className="font-heading text-lg font-semibold text-[#1a1a1a]">{r.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4a4a4a]">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <a
            href="{{RULES_PDF_URL}}"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/20"
          >
            <FileText className="h-4 w-4" /> Download the full Rules (PDF)
          </a>
        </Reveal>
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="Questions about how we're run?"
        sub="The committee is happy to walk any member through our governance and accounts."
        primary={{ label: "Contact the committee", href: "/contact" }}
        secondary={{ label: "Meet the committee", href: "/committee" }}
      />
    </>
  )
}
