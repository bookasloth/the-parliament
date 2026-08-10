import type { Metadata } from "next"
import { Zap, Bell, WifiOff, ShieldCheck } from "lucide-react"
import { Section, Eyebrow, Reveal } from "@/components/marketing/primitives"
import { LogoMark } from "@/components/shared/Logo"
import { InstallAppButton } from "@/components/marketing/InstallAppButton"

export const metadata: Metadata = {
  title: "Get the NNAWCA app — install on your phone",
  description:
    "Install the NNAWCA alumni app on your phone or desktop in one tap. Fast, works offline, and sends you notifications — no app store needed.",
}

const PERKS = [
  { icon: Zap, title: "Loads instantly", sub: "Opens from your home screen like a native app — no browser bar.", accent: 0 as const },
  { icon: Bell, title: "Push notifications", sub: "Get pinged for messages, events and reactions — even when closed.", accent: 1 as const },
  { icon: WifiOff, title: "Works offline", sub: "Cached so it opens on a weak signal or no connection at all.", accent: 3 as const },
  { icon: ShieldCheck, title: "No app store", sub: "Installs straight from this page. Nothing to download, always up to date.", accent: 2 as const },
]

const ACCENT_SOFT = ["bg-brand-50 text-brand", "bg-[#fdecea] text-[#e8503a]", "bg-[#fff8e1] text-[#d4a800]", "bg-[#eef6e8] text-[#70ad47]"]

export default function DownloadPage() {
  return (
    <Section width="6xl" className="pt-28 pb-16 lg:pt-32 text-center">
      <Reveal>
        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[16px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(26,26,26,0.3)]">
          <LogoMark className="h-12 w-12" />
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <Eyebrow className="mb-4">Get the app</Eyebrow>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="mx-auto max-w-2xl font-heading text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          The whole network, on your home screen
        </h1>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#5b5b5b] sm:text-lg">
          Install NNAWCA in one tap. It works like a real app — fast, offline-ready, with
          notifications — and there&apos;s nothing to download from an app store.
        </p>
      </Reveal>
      <Reveal delay={0.2}>
        <div className="mt-9 flex justify-center">
          <InstallAppButton />
        </div>
      </Reveal>

      <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-2">
        {PERKS.map((p, i) => (
          <Reveal key={p.title} delay={0.1 + i * 0.06}>
            <div className="flex items-start gap-4 rounded-[6px] border border-black/[0.06] bg-white p-5 text-left shadow-sm">
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[6px] ${ACCENT_SOFT[p.accent]}`}>
                <p.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-heading text-base font-semibold text-[#1a1a1a]">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#5b5b5b]">{p.sub}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
