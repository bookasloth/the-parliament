"use client"

import { useCallback } from "react"
import type { InterestsData } from "@/lib/onboarding"
import { INTEREST_OPTIONS, MIN_INTERESTS } from "@/lib/onboarding"

interface StepInterestsProps {
  data: InterestsData
  set: (patch: Partial<InterestsData>) => void
  onNext: () => void
}

export function StepInterests({ data, set, onNext }: StepInterestsProps) {
  const selected = data.interestIds
  const enough = selected.length >= MIN_INTERESTS

  const toggle = useCallback(
    (slug: string) => {
      set({
        interestIds: selected.includes(slug)
          ? selected.filter((s) => s !== slug)
          : [...selected, slug],
      })
    },
    [selected, set],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">What are you into?</h1>
        <p className="text-sm text-gray-500">Pick at least {MIN_INTERESTS} — we&apos;ll tailor your feed.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {INTEREST_OPTIONS.map((interest) => {
          const isSel = selected.includes(interest.slug)
          return (
            <button
              key={interest.slug}
              type="button"
              onClick={() => toggle(interest.slug)}
              className={`rounded-lg border-2 p-4 text-center text-sm font-semibold transition-all ${
                isSel
                  ? "border-brand bg-brand-50 text-brand ring-2 ring-brand-100"
                  : "border-gray-200 bg-white text-gray-900 hover:border-gray-300"
              }`}
            >
              {interest.name}
            </button>
          )
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!enough}
        className={`w-full rounded py-3 text-base font-semibold text-white transition-colors ${
          enough ? "bg-brand hover:bg-brand-600" : "cursor-not-allowed bg-gray-300"
        }`}
      >
        {enough ? "Continue" : `Pick ${MIN_INTERESTS - selected.length} more`}
      </button>
    </div>
  )
}
