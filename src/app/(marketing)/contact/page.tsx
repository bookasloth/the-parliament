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
    <Section width="7xl" className="pt-32 lg:pt-40">
      <div className="max-w-2xl">
        <Reveal>
          <Eyebrow>Contact</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            Say hello. We read every message.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 text-lg leading-relaxed text-[#5b5b5b]">
            Membership, events, donations, a correction to your profile, or just to reconnect —
            drop us a line and the committee will get back to you.
          </p>
        </Reveal>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Info column */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {INFO.map((it, i) => {
            const Icon = it.icon
            const inner = (
              <div className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_10px_28px_-12px_rgba(26,26,26,0.16)]">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${ACCENT_HEX[it.accent]}1a`, color: ACCENT_HEX[it.accent] }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#a3a3a3]">
                    {it.label}
                  </p>
                  <p className="mt-0.5 font-medium text-[#1a1a1a]">{it.value}</p>
                </div>
              </div>
            )
            return (
              <Reveal key={it.label} delay={i * 0.06}>
                {it.href ? (
                  <a href={it.href} className="block">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </Reveal>
            )
          })}
        </div>

        {/* Form */}
        <Reveal delay={0.1}>
          <ContactForm />
        </Reveal>
      </div>
    </Section>
  )
}
