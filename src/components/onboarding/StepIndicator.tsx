"use client"

import { Check } from "lucide-react"
import { ONBOARDING_STEPS, STEP_INDEX, STEP_LABELS } from "@/lib/onboarding"
import type { OnboardingStep } from "@/lib/onboarding"

export function StepIndicator({ current }: { current: OnboardingStep }) {
  const currentIdx = STEP_INDEX[current]

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {ONBOARDING_STEPS.filter((s) => s !== "complete").map((step, i) => {
        const isCompleted = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={step} className="flex items-center gap-1 sm:gap-2">
            <div
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-all ${
                isCompleted
                  ? "bg-brand text-white"
                  : isCurrent
                  ? "bg-brand text-white ring-2 ring-brand-200"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden sm:inline text-xs font-medium ${
                isCompleted || isCurrent ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {STEP_LABELS[step]}
            </span>
            {i < ONBOARDING_STEPS.filter((s) => s !== "complete").length - 1 && (
              <div className={`hidden sm:block h-0.5 w-6 sm:w-10 ${isCompleted ? "bg-brand" : "bg-gray-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
