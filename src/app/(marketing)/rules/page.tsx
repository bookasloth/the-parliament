import type { Metadata } from "next"
import { FileText, Scale } from "lucide-react"
import { Section, Eyebrow, Reveal, CtaBand } from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Rules & Regulations — NNAWCA",
  description:
    "The Rules & Regulations of the Nagpur Navodaya Alumni Welfare and Charitable Association — membership, the Executive Committee, elections, meetings, finances and amendments.",
}

const SECTIONS: { heading: string; body: string }[] = [
  { heading: "1. Membership", body: "Membership is open to alumni, students and staff of JNV Nagpur. Tiers are Student, Associate, Premium and Life, with a Committee tier by invitation. Members must use their real legal identity; pseudonyms are not permitted. The committee may admit, suspend or remove members per these rules." },
  { heading: "2. The Executive Committee", body: "An eleven-member Executive Committee, elected by the membership, holds the association's mandate. Office-bearers include the President, Vice President, Secretaries and Treasurers, supported by four focused sub-committees." },
  { heading: "3. Elections & tenure", body: "Committee members are elected for a defined tenure through a member vote overseen by the Election sub-committee. Casual vacancies are filled for the remainder of the term in accordance with the Memorandum." },
  { heading: "4. Meetings", body: "The association holds an Annual General Meeting open to all members, alongside regular committee meetings. Notice periods, quorum and voting procedures follow the registered rules." },
  { heading: "5. Finances", body: "Funds are held in the association's name and applied only to its stated objects. Accounts are maintained transparently, audited as required, and presented to members. Donations are directed to their designated causes." },
  { heading: "6. Duties & conduct", body: "Members and office-bearers act in the association's interest, uphold its charitable character, and avoid conflicts of interest. Conduct that harms the community or the school may attract action under these rules." },
  { heading: "7. Amendments", body: "The Memorandum and these Rules may be amended only by the process they prescribe, with member approval, and in accordance with applicable law." },
]

export default function RulesPage() {
  return (
    <>
      <Section width="5xl" className="pt-32 lg:pt-40">
        <Reveal>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8503a]/10 text-[#e8503a]">
            <Scale className="h-6 w-6" />
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <Eyebrow accent={1} className="mt-6">The rulebook</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.03em] text-[#1a1a1a] sm:text-5xl">
            Rules &amp; Regulations
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-5 text-lg leading-relaxed text-[#5b5b5b]">
            How the association is run day to day — membership, the committee, elections, meetings and
            finances. This page summarises the Rules; the registered document prevails.
          </p>
        </Reveal>
      </Section>

      <Section width="5xl" className="pt-0">
        <div className="space-y-4">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.heading} delay={(i % 3) * 0.05}>
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <h2 className="font-heading text-lg font-semibold text-[#1a1a1a]">{s.heading}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4a4a4a]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <a
            href="{{RULES_PDF_URL}}"
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/20"
          >
            <FileText className="h-4 w-4" /> Download the full Rules (PDF)
          </a>
        </Reveal>
      </Section>

      <CtaBand
        title="Questions about how we're run?"
        sub="The committee is happy to walk any member through our governance and accounts."
        primary={{ label: "Contact the committee", href: "/contact" }}
        secondary={{ label: "Read the Memorandum", href: "/moa" }}
      />
    </>
  )
}
