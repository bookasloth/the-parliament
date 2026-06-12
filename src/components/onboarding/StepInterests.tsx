"use client"

import { useState, useCallback } from "react"
import type { InterestsData } from "@/lib/onboarding"
import { INTEREST_OPTIONS } from "@/lib/onboarding"

interface StepInterestsProps {
  data: InterestsData
  onNext: () => void
}

export function StepInterests({ data, onNext }: StepInterestsProps) {
  const [selected, setSelected] = useState<string[]>(data.interestIds)
  const [saving, setSaving] = useState(false)

  const toggle = useCallback((slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }, [])

  const handleNext = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/onboarding/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interestIds: selected }),
      })
      if (!res.ok) throw new Error("Failed to save")
      onNext()
    } catch {
      setSaving(false)
    }
  }, [selected, onNext])

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Interests</h1>
        <p className="text-sm text-gray-500">Select topics you care about (multi-select)</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {INTEREST_OPTIONS.map((interest) => {
          const isSelected = selected.includes(interest.slug)
          return (
            <button
              key={interest.slug}
              type="button"
              onClick={() => toggle(interest.slug)}
              className={`rounded-lg border-2 p-4 text-center transition-all ${
                isSelected
                  ? "border-brand bg-brand-50 ring-2 ring-brand-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className={`text-sm font-semibold ${isSelected ? "text-brand" : "text-gray-900"}`}>
                {interest.name}
              </p>
            </button>
          )
        })}
      </div>

      <button
        onClick={handleNext}
        disabled={saving || selected.length === 0}
        className={`w-full rounded py-3 text-base font-semibold text-white transition-colors ${
          saving || selected.length === 0
            ? "cursor-not-allowed bg-gray-300"
            : "bg-brand hover:bg-brand-600"
        }`}
      >
        {saving ? "Saving..." : `Continue (${selected.length} selected)`}
      </button>
    </div>
  )
}
