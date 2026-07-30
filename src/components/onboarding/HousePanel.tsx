"use client"

import { HOUSES, ONBOARDING_STEPS, STEP_LABELS } from "@/lib/onboarding"

const TAGLINES: Record<string, string> = {
  verify: "One network. Every batch. Every house.",
  work: "Where has JNV taken you?",
  media: "Put a face to the name.",
  interests: "Find your people faster.",
  intro: "Time to introduce yourself.",
}

export function HousePanel({ stepIndex }: { stepIndex: number }) {
  const step = ONBOARDING_STEPS[Math.min(stepIndex, ONBOARDING_STEPS.length - 1)]
  const accent = HOUSES[stepIndex % HOUSES.length]

  return (
    <div className="relative hidden overflow-hidden bg-navy-900 lg:flex lg:w-2/5 lg:flex-col lg:justify-between">
      {/* Layered house-colour glow, keyed to the current step's house. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90 transition-all duration-700"
        style={{
          background: `radial-gradient(120% 90% at 80% 0%, ${accent.hex}55 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, ${HOUSES[(stepIndex + 3) % HOUSES.length].hex}44 0%, transparent 60%), linear-gradient(160deg, #0b1f3a 0%, #0b1f3a 100%)`,
        }}
      />

      <div className="relative z-10 p-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-white/60">NNAWCA</p>
        <p className="mt-1 font-heading text-3xl font-bold text-white">The Parliament</p>
        <p className="mt-6 max-w-xs text-lg font-medium leading-snug text-white/90">
          {TAGLINES[step]}
        </p>
      </div>

      <div className="relative z-10 p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Our houses</p>
        <div className="flex flex-wrap gap-2.5">
          {HOUSES.map((h, i) => {
            const active = i === stepIndex % HOUSES.length
            return (
              <span
                key={h.name}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  active ? "bg-white/95 text-navy-900 shadow-lg" : "bg-white/10 text-white/80"
                }`}
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: h.hex }} />
                {h.name}
              </span>
            )
          })}
        </div>

        <p className="mt-8 text-xs text-white/40">
          Step {stepIndex + 1} of {ONBOARDING_STEPS.length} · {STEP_LABELS[step]}
        </p>
      </div>
    </div>
  )
}
