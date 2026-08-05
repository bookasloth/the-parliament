import type { Metadata } from "next"
import { Award, Shield, GraduationCap, Briefcase, HeartHandshake, Medal, MapPin, Quote } from "lucide-react"
import {
  Section,
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
  honour: string // designation / achievement — the primary label under the name
  organization: string
  location: string
  note: string // one-line notable highlight
  category: string
  icon: typeof Award
  accent: 0 | 1 | 2 | 3
}
const HONOREES: Honoree[] = [
  { name: "{{Name}}", batch: "2006–2013", honour: "Indian Administrative Service", organization: "Government of India", location: "New Delhi", note: "Led district rural-development programmes reaching 2M+ residents.", category: "Civil Services", icon: Shield, accent: 0 },
  { name: "{{Name}}", batch: "2007–2014", honour: "Commissioned Officer", organization: "Indian Army", location: "Northern Command", note: "Recognised for service in high-altitude operations.", category: "Defence", icon: Medal, accent: 1 },
  { name: "{{Name}}", batch: "2005–2012", honour: "Professor & Researcher", organization: "IIT · research faculty", location: "Mumbai", note: "Published widely in machine learning; mentors 20+ scholars.", category: "Academia", icon: GraduationCap, accent: 3 },
  { name: "{{Name}}", batch: "2008–2015", honour: "Founder & CEO", organization: "Technology startup", location: "Bengaluru", note: "Built a profitable SaaS company employing 60+ people.", category: "Business", icon: Briefcase, accent: 2 },
  { name: "{{Name}}", batch: "2004–2011", honour: "Doctor & Public-Health Leader", organization: "AIIMS", location: "New Delhi", note: "Ran vaccination drives across underserved districts.", category: "Medicine", icon: HeartHandshake, accent: 1 },
  { name: "{{Name}}", batch: "2009–2016", honour: "National-level Achiever", organization: "Sports & Arts", location: "Nagpur", note: "Represented the state at national championships.", category: "Sports & Arts", icon: Award, accent: 0 },
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
            const accent = ACCENT_HEX[h.accent]
            return (
              <Reveal key={i} delay={(i % 3) * 0.07}>
                <div
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_28px_56px_-20px_rgba(26,26,26,0.32)]"
                >
                  {/* Accent ring on hover */}
                  <span
                    className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 ring-2 ring-inset transition-opacity duration-300 group-hover:opacity-100"
                    style={{ color: accent }}
                  />

                  {/* Accent header band — category chip + watermark icon */}
                  <div
                    className="relative h-24 overflow-hidden px-6 pt-5"
                    style={{ background: `linear-gradient(135deg, ${accent}1f, ${accent}05)` }}
                  >
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: `${accent}1f`, color: accent }}
                    >
                      {h.category}
                    </span>
                    <Icon
                      className="absolute -right-3 -bottom-4 h-24 w-24 opacity-15 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-25"
                      style={{ color: accent }}
                    />
                  </div>

                  {/* Avatar overlapping the band */}
                  <div className="px-6">
                    <span
                      className="-mt-9 flex h-16 w-16 items-center justify-center rounded-2xl font-heading text-xl font-semibold text-white shadow-md ring-4 ring-white"
                      style={{ backgroundColor: accent }}
                    >
                      {initials(h.name)}
                    </span>
                  </div>

                  {/* Name (hero) + designation */}
                  <div className="mt-3 px-6">
                    <h3 className="font-heading text-2xl font-bold leading-tight tracking-[-0.01em] text-[#1a1a1a]">
                      {h.name}
                    </h3>
                    <p className="mt-1.5 text-[15px] font-semibold" style={{ color: accent }}>
                      {h.honour}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-[#5b5b5b]">
                      <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 opacity-60" /> {h.organization}</span>
                      <span className="text-black/15">·</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 opacity-60" /> {h.location}</span>
                    </div>
                  </div>

                  {/* Notable highlight */}
                  <div className="mt-4 px-6">
                    <p className="flex gap-2 text-[13px] leading-relaxed text-[#5b5b5b]">
                      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40" style={{ color: accent }} />
                      {h.note}
                    </p>
                  </div>

                  {/* Footer strip */}
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/5 px-6 py-3.5 pt-4 text-xs font-medium text-[#8a8a8a]">
                    <span className="inline-flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5" style={{ color: accent }} /> Honoured by NNAWCA
                    </span>
                    <span className="tabular-nums">Batch of {h.batch}</span>
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
