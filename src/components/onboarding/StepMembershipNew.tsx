"use client"

import { useState, useCallback } from "react"
import { Check, Sparkles } from "lucide-react"
import type { MembershipData } from "@/lib/onboarding"
import { MEMBERSHIP_BENEFITS, MEMBERSHIP_PLANS } from "@/lib/onboarding"
import { useRouter } from "next/navigation"

interface StepMembershipNewProps {
  data: MembershipData
  onNext: (skip?: boolean) => void
}

export function StepMembershipNew({ data, onNext }: StepMembershipNewProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(data.selectedPlan)
  const [saving, setSaving] = useState(false)

  const handleSelect = useCallback((plan: string) => {
    setSelected(plan)
  }, [])

  const handleNext = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/onboarding/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedPlan: selected }),
      })
      if (!res.ok) throw new Error("Failed to save")
      onNext(!selected)
    } catch {
      setSaving(false)
    }
  }, [selected, onNext])

  const handleSkip = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/onboarding/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedPlan: null }),
      })
      if (!res.ok) throw new Error("Failed to save")
      onNext(true)
    } catch {
      setSaving(false)
    }
  }, [onNext])

  const handleSubscribe = useCallback(async (plan: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/membership/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.orderId && data.amount) {
        router.push(`/onboarding/complete`)
      } else {
        await handleNext()
      }
    } catch {
      setSaving(false)
    }
  }, [handleNext, router])

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Choose Membership</h1>
        <p className="text-sm text-gray-500">Unlock the full alumni experience</p>
      </div>

      <div className="rounded border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-brand" />
          Member Benefits
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {MEMBERSHIP_BENEFITS.map((b) => (
            <div key={b.title} className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <span>{b.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {(["annual", "lifetime"] as const).map((plan) => {
          const p = MEMBERSHIP_PLANS[plan]
          const isSelected = selected === plan
          return (
            <button
              key={plan}
              type="button"
              onClick={() => handleSelect(plan)}
              className={`w-full rounded border-2 p-4 text-left transition-all ${
                isSelected ? "border-brand bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-400">{p.duration}</p>
                </div>
                <p className="text-lg font-bold text-brand">{p.price}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => selected && handleSubscribe(selected)}
          disabled={saving || !selected}
          className={`w-full rounded py-3 text-base font-semibold transition-colors ${
            selected
              ? "bg-brand text-white hover:bg-brand-600"
              : "cursor-not-allowed bg-gray-200 text-gray-400"
          }`}
        >
          {saving ? "Processing..." : "Become Member"}
        </button>
        <button
          onClick={handleSkip}
          className="w-full rounded py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip for Now
        </button>
      </div>
    </div>
  )
}
