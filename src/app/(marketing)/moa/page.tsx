import type { Metadata } from "next"
import { Download, Landmark } from "lucide-react"
import { Section, Eyebrow, Reveal, CtaBand } from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Memorandum of Association — NNAWCA",
  description:
    "The Memorandum of Association of the Nagpur Navodaya Alumni Welfare and Charitable Association — its name, registered office, objects and charitable purpose.",
}

const CLAUSES: { heading: string; body: string[] }[] = [
  {
    heading: "1. Name of the Association",
    body: ["The name of the association is the “Nagpur Navodaya Alumni Welfare and Charitable Association” (NNAWCA)."],
  },
  {
    heading: "2. Registered office",
    body: ["The registered office of the association is situated in Nagpur, Maharashtra. {{Full registered address}}"],
  },
  {
    heading: "3. Objects of the Association",
    body: [
      "To connect and support alumni of Jawahar Navodaya Vidyalaya, Nagpur, across the world.",
      "To advance the welfare of members and their families in times of genuine need.",
      "To fund scholarships and educational support for deserving students of the school.",
      "To support the school through infrastructure, mentoring and campus initiatives.",
      "To promote charitable, social and community activities in the spirit of Navodaya.",
      "To organise reunions, events and programmes that keep the alumni community engaged.",
    ],
  },
  {
    heading: "4. Application of income and property",
    body: ["The income and property of the association shall be applied solely towards the promotion of its objects. No portion shall be paid or transferred, directly or indirectly, as profit to any member."],
  },
  {
    heading: "5. Non-profit and charitable character",
    body: ["The association is not established for profit. It operates on a not-for-profit, charitable basis in accordance with the applicable law under which it is registered."],
  },
  {
    heading: "6. Dissolution",
    body: ["On dissolution, any assets remaining after settlement of debts and liabilities shall be transferred to another society or trust with similar objects, and not distributed among members, as required by law."],
  },
]

export default function MoaPage() {
  return (
    <>
      <Section width="5xl" className="pt-32 lg:pt-40">
        <Reveal>
          <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-brand/10 text-brand">
            <Landmark className="h-6 w-6" />
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <Eyebrow className="mt-6">The charter</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.03em] text-[#1a1a1a] sm:text-5xl">
            Memorandum of Association
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-5 text-lg leading-relaxed text-[#5b5b5b]">
            The founding charter of NNAWCA — its name, registered office and the charitable objects it
            exists to serve. This page summarises the Memorandum; the registered document prevails.
          </p>
        </Reveal>
      </Section>

      <Section width="5xl" className="pt-0">
        <div className="space-y-8">
          {CLAUSES.map((c, i) => (
            <Reveal key={c.heading} delay={(i % 3) * 0.05}>
              <div className="border-l-2 border-brand/30 pl-6">
                <h2 className="font-heading text-xl font-semibold text-[#1a1a1a]">{c.heading}</h2>
                {c.body.length === 1 ? (
                  <p className="mt-2 text-[15px] leading-relaxed text-[#4a4a4a]">{c.body[0]}</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {c.body.map((b, j) => (
                      <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-[#4a4a4a]">
                        <span className="font-heading font-semibold text-brand">({String.fromCharCode(97 + j)})</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <a
            href="{{MOA_PDF_URL}}"
            className="mt-10 inline-flex items-center gap-2 rounded-[3px] bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <Download className="h-4 w-4" /> Download the registered Memorandum (PDF)
          </a>
        </Reveal>
      </Section>

      <CtaBand
        title="Read the Rules & Regulations next."
        sub="The Memorandum says why we exist; the Rules set out how the association is run."
        primary={{ label: "View the Rules", href: "/rules" }}
        secondary={{ label: "Governance overview", href: "/governance" }}
      />
    </>
  )
}
