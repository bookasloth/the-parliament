"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import type { PlanData } from "@/lib/onboarding"
import { PLANS } from "@/config/membership"
import { reachedStep } from "@/app/(onboarding)/onboarding/actions"

const OPTIONS: { code: "student" | "associate" | "premium" | "life"; recommended?: boolean }[] = [
  { code: "student" },
  { code: "associate" },
  { code: "premium", recommended: true },
  { code: "life" },
]
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`

export function StepPlan({
  data, set, onNext, onSkip,
}: {
  data: PlanData
  set: (patch: Partial<PlanData>) => void
  onNext: () => void
  onSkip: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const selected = data.planCode || "student"

  async function submit() {
    if (selected === "student") { onNext(); return }
    // Paid plan → real Razorpay checkout. Park onboarding at the intro step so
    // the member resumes there after payment.
    setBusy(true)
    try {
      await reachedStep("intro")
      router.push(`/membership/checkout?plan=${selected}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Pick your membership</h1>
        <p className="text-sm text-gray-500">Start free as a Student — upgrade any time. You can skip this.</p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map(({ code, recommended }) => {
          const plan = PLANS[code]
          const isSel = selected === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => set({ planCode: code })}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                isSel ? "border-brand bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${isSel ? "border-brand bg-brand text-white" : "border-gray-300"}`}>
                {isSel && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{plan.displayName}</span>
                  {recommended && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">RECOMMENDED</span>}
                </span>
                <span className="mt-0.5 block truncate text-xs text-gray-500">{plan.description}</span>
              </span>
              <span className="flex-shrink-0 text-right">
                <span className="text-sm font-black text-gray-900">{plan.pricePaise === 0 ? "Free" : rupees(plan.pricePaise)}</span>
                {plan.pricePaise > 0 && <span className="block text-[10px] text-gray-400">{plan.isSubscription ? "/ year" : "once"}</span>}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onSkip} className="rounded-lg px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100">Skip</button>
        <button onClick={submit} disabled={busy} className="flex-1 rounded-lg bg-brand py-3 text-base font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
          {busy ? "Opening checkout…" : selected === "student" ? "Continue with Student" : `Continue with ${PLANS[selected as "premium"].displayName}`}
        </button>
      </div>
    </div>
  )
}
