import type { Metadata } from "next"
import { Mail, MapPin, Clock, MessageCircle } from "lucide-react"
import {
  Section,
  Eyebrow,
  Reveal,
  ACCENT_HEX,
} from "@/components/marketing/primitives"
import { ContactForm } from "./ContactForm"

export const metadata: Metadata = {
  title: "Contact NNAWCA — reach the alumni committee",
  description:
    "Questions about membership, events, donations or the network? Reach the NNAWCA committee — we reply within a day or two.",
}

// {{PLACEHOLDER}} — confirm the real public contact details round-2.
const INFO = [
  { icon: Mail, label: "Email", value: "contact@nnawca.org", href: "mailto:contact@nnawca.org", accent: 0 as const },
  { icon: MessageCircle, label: "Membership", value: "membership@nnawca.org", href: "mailto:membership@nnawca.org", accent: 1 as const },
  { icon: MapPin, label: "Based in", value: "Nagpur, Maharashtra, India", accent: 3 as const },
  { icon: Clock, label: "Response time", value: "Within 1–2 days", accent: 2 as const },
]

export default function ContactPage() {
  return (
    <Section width="7xl" className="pt-28 pb-16 lg:pt-32">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        {/* Left — hero + 2×2 info grid */}
        <div>
          <Reveal>
            <Eyebrow>Contact</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:leading-[1.05]">
              Say hello. We read every message.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#5b5b5b]">
              Membership, events, donations, a profile correction, or just to reconnect — drop us a
              line and the committee will get back to you.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {INFO.map((it, i) => {
              const Icon = it.icon
              const inner = (
                <div
                  className="group h-full rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-18px_rgba(26,26,26,0.2)]"
                  style={{ backgroundColor: `${ACCENT_HEX[it.accent]}0a`, borderColor: `${ACCENT_HEX[it.accent]}22` }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-105"
                    style={{ backgroundColor: `${ACCENT_HEX[it.accent]}1f`, color: ACCENT_HEX[it.accent] }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#a3a3a3]">
                    {it.label}
                  </p>
                  <p className="mt-0.5 font-medium text-[#1a1a1a]">{it.value}</p>
                </div>
              )
              return (
                <Reveal key={it.label} delay={i * 0.06}>
                  {it.href ? <a href={it.href} className="block h-full">{inner}</a> : inner}
                </Reveal>
              )
            })}
          </div>
        </div>

        {/* Right — form */}
        <Reveal delay={0.1}>
          <ContactForm />
        </Reveal>
      </div>
    </Section>
  )
}
