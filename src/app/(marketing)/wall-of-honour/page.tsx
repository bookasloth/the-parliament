import type { Metadata } from "next"
import { Award, Shield, GraduationCap, Briefcase, HeartHandshake, Medal } from "lucide-react"
import {
  Section,
  SectionHeading,
  Eyebrow,
  Reveal,
  CtaBand,
  ACCENT_HEX,
} from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Wall of Honour — alumni who make us proud",
  description:
    "Celebrating JNV Nagpur alumni whose work in civil services, defence, academia, business and public life brings pride to the Navodaya family.",
}

// {{PLACEHOLDER}} — swap with real honorees (name, batch, honour, photo) round-2.
interface Honoree {
  name: string
  batch: string
  honour: string
  category: string
  icon: typeof Award
  accent: 0 | 1 | 2 | 3
}
const HONOREES: Honoree[] = [
  { name: "{{Name}}", batch: "Batch of {{year}}", honour: "Indian Administrative Service", category: "Civil Services", icon: Shield, accent: 0 },
  { name: "{{Name}}", batch: "Batch of {{year}}", honour: "Commissioned Officer, Indian Army", category: "Defence", icon: Medal, accent: 1 },
  { name: "{{Name}}", batch: "Batch of {{year}}", honour: "Professor & Researcher", category: "Academia", icon: GraduationCap, accent: 3 },
  { name: "{{Name}}", batch: "Batch of {{year}}", honour: "Founder & Entrepreneur", category: "Business", icon: Briefcase, accent: 2 },
  { name: "{{Name}}", batch: "Batch of {{year}}", honour: "Doctor & Public-Health Leader", category: "Medicine", icon: HeartHandshake, accent: 1 },
  { name: "{{Name}}", batch: "Batch of {{year}}", honour: "National-level Achiever", category: "Sports & Arts", icon: Award, accent: 0 },
]

export default function WallOfHonourPage() {
  return (
    <>
      {/* ── Hero ── */}
      <Section width="6xl" className="pt-32 lg:pt-40 text-center">
        <Reveal>
          <Eyebrow accent={2}>Wall of Honour</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-5 max-w-4xl font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            The pride of Navodaya, Nagpur.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#5b5b5b]">
            From the same classrooms and dusty grounds, our alumni have gone on to serve the
            nation, build companies, heal the sick and push the frontiers of knowledge. This wall
            is where we honour them.
          </p>
        </Reveal>
      </Section>

      {/* ── Honoree grid ── */}
      <Section width="7xl" className="pt-0">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {HONOREES.map((h, i) => {
            const Icon = h.icon
            return (
              <Reveal key={i} delay={(i % 3) * 0.07}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-black/5 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_16px_40px_-16px_rgba(26,26,26,0.2)]">
                  <span
                    className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-10 transition group-hover:opacity-20"
                    style={{ backgroundColor: ACCENT_HEX[h.accent] }}
                  />
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${ACCENT_HEX[h.accent]}1a`, color: ACCENT_HEX[h.accent] }}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: `${ACCENT_HEX[h.accent]}14`, color: ACCENT_HEX[h.accent] }}
                    >
                      {h.category}
                    </span>
                  </div>
                  <h3 className="mt-6 font-heading text-xl font-semibold text-[#1a1a1a]">
                    {h.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#8a8a8a]">{h.batch}</p>
                  <p className="mt-3 text-[15px] font-medium text-[#3a3a3a]">{h.honour}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* ── Nominate CTA ── */}
      <CtaBand
        title="Know an alumnus who belongs here?"
        sub="Nominate a Navodaya batchmate whose work deserves recognition — the committee reviews every name."
        primary={{ label: "Nominate someone", href: "/contact" }}
        secondary={{ label: "Become a member", href: "/join" }}
      />
    </>
  )
}
