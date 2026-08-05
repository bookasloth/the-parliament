import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import {
  Section,
  Eyebrow,
  Reveal,
  CtaBand,
} from "@/components/marketing/primitives"
import { EXECUTIVE, ADVISORY } from "@/lib/committee"
import { CommitteeTabs } from "@/components/marketing/CommitteeTabs"

const HERO_IMG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&h=760&fit=crop"

export const metadata: Metadata = {
  title: "Committee — the alumni who run NNAWCA",
  description:
    "The NNAWCA Executive Committee and Advisory Committee — the alumni who run the network.",
}

export default function CommitteePage() {
  return (
    <>
      {/* ── Hero (split) ── */}
      <Section width="6xl" className="pt-32 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <Eyebrow>Our committee</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
                The alumni who keep the family running.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#5b5b5b]">
                An elected Executive Committee steers NNAWCA, guided by an Advisory Committee
                of past office-bearers. Every one of them is a JNV Nagpur alumnus giving their
                own time.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-[#5b5b5b]">
                <ShieldCheck className="h-4 w-4 text-[#70ad47]" />
                Elected roster · verified alumni
              </div>
            </Reveal>
          </div>

          {/* Right — community image ({{PLACEHOLDER}} → real committee group photo) */}
          <Reveal delay={0.2} className="hidden lg:block">
            <div className="relative">
              <div
                className="aspect-[4/3.4] w-full rounded-3xl bg-cover bg-center shadow-[0_24px_60px_-24px_rgba(26,26,26,0.32)]"
                style={{ backgroundImage: `url(${HERO_IMG})` }}
              />
              <div className="absolute -bottom-5 left-6 rounded-2xl border border-black/5 bg-white px-5 py-3 shadow-lg">
                <p className="font-heading text-2xl font-semibold text-brand">11 + 11</p>
                <p className="text-xs text-[#8a8a8a]">Executive & advisory members</p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Committee groups (tabbed) ── */}
      <Section width="7xl" className="pt-4">
        <CommitteeTabs executive={EXECUTIVE} advisory={ADVISORY} />
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
