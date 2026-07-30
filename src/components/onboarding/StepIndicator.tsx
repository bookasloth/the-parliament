"use client"

import { Check } from "lucide-react"
import { ONBOARDING_STEPS, STEP_INDEX, STEP_LABELS } from "@/lib/onboarding"
import type { OnboardingStep } from "@/lib/onboarding"

export function StepIndicator({ current }: { current: OnboardingStep }) {
  const currentIdx = STEP_INDEX[current]

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {ONBOARDING_STEPS.map((step, i) => {
        const isCompleted = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={step} className="flex items-center gap-1 sm:gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all sm:h-9 sm:w-9 sm:text-sm ${
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
              className={`hidden text-xs font-medium sm:inline ${
                isCompleted || isCurrent ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {STEP_LABELS[step]}
            </span>
            {i < ONBOARDING_STEPS.length - 1 && (
              <div className={`hidden h-0.5 w-6 sm:block sm:w-10 ${isCompleted ? "bg-brand" : "bg-gray-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
