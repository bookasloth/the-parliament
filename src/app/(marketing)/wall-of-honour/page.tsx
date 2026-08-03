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
  organization: string
  category: string
  icon: typeof Award
  accent: 0 | 1 | 2 | 3
}
const HONOREES: Honoree[] = [
  { name: "{{Name}}", batch: "2006–2013", honour: "Indian Administrative Service", organization: "Government of India", category: "Civil Services", icon: Shield, accent: 0 },
  { name: "{{Name}}", batch: "2007–2014", honour: "Commissioned Officer", organization: "Indian Army", category: "Defence", icon: Medal, accent: 1 },
  { name: "{{Name}}", batch: "2005–2012", honour: "Professor & Researcher", organization: "IIT · research faculty", category: "Academia", icon: GraduationCap, accent: 3 },
  { name: "{{Name}}", batch: "2008–2015", honour: "Founder & CEO", organization: "Technology startup", category: "Business", icon: Briefcase, accent: 2 },
  { name: "{{Name}}", batch: "2004–2011", honour: "Doctor & Public-Health Leader", organization: "AIIMS", category: "Medicine", icon: HeartHandshake, accent: 1 },
  { name: "{{Name}}", batch: "2009–2016", honour: "National-level Achiever", organization: "Sports & Arts", category: "Sports & Arts", icon: Award, accent: 0 },
]

const initials = (n: string) => n.replace(/[{}]/g, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "★"

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
                <div
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-18px_rgba(26,26,26,0.28)]"
                  style={{ borderTop: `3px solid ${ACCENT_HEX[h.accent]}` }}
                >
                  {/* Category badge */}
                  <div className="flex items-center justify-between px-6 pt-5">
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: `${ACCENT_HEX[h.accent]}14`, color: ACCENT_HEX[h.accent] }}
                    >
                      {h.category}
                    </span>
                    <Icon className="h-5 w-5 opacity-30 transition group-hover:opacity-60" style={{ color: ACCENT_HEX[h.accent] }} />
                  </div>

                  {/* Identity — avatar + name (primary) */}
                  <div className="flex items-center gap-3.5 px-6 pt-4">
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-heading text-lg font-semibold text-white shadow-sm"
                      style={{ backgroundColor: ACCENT_HEX[h.accent] }}
                    >
                      {initials(h.name)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-[22px] font-semibold leading-tight text-[#1a1a1a]">
                        {h.name}
                      </h3>
                      <p className="truncate text-[13px] text-[#8a8a8a]">Batch of {h.batch}</p>
                    </div>
                  </div>

                  {/* Achievement — prominent */}
                  <div className="mt-4 px-6">
                    <p className="text-[15px] font-semibold text-[#1a1a1a]">{h.honour}</p>
                    <p className="mt-0.5 text-sm text-[#5b5b5b]">{h.organization}</p>
                  </div>

                  {/* Footer strip */}
                  <div className="mt-5 flex items-center gap-2 border-t border-black/5 px-6 py-3.5 text-xs font-medium text-[#8a8a8a]">
                    <Award className="h-3.5 w-3.5" style={{ color: ACCENT_HEX[h.accent] }} />
                    Honoured by NNAWCA
                  </div>
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
