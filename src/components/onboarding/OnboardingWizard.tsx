"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StepIndicator } from "./StepIndicator"
import { StepProfileNew } from "./StepProfileNew"
import { StepJnv } from "./StepJnv"
import { StepInterests } from "./StepInterests"
import { StepMembershipNew } from "./StepMembershipNew"
import { StepCompleteNew } from "./StepCompleteNew"
import type { OnboardingStep } from "@/lib/onboarding"
import { EMPTY_ONBOARDING, ONBOARDING_STEPS } from "@/lib/onboarding"
import type { OnboardingData } from "@/lib/onboarding"

interface OnboardingWizardProps {
  currentStep: OnboardingStep
}

export function OnboardingWizard({ currentStep }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>(currentStep)
  const [data] = useState<OnboardingData>(EMPTY_ONBOARDING)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch("/api/onboarding/progress")
        if (res.ok) {
          const json = await res.json()
          if (json.step && ONBOARDING_STEPS.includes(json.step as OnboardingStep)) {
            setStep(json.step as OnboardingStep)
          }
        }
      } catch {
        // use defaults
      } finally {
        setLoaded(true)
      }
    }
    loadProgress()
  }, [])

  const goToStep = useCallback(
    (nextStep: OnboardingStep) => {
      setStep(nextStep)
      router.push(`/onboarding/${nextStep}`)
    },
    [router],
  )

  const handleNext = useCallback(
    (skipValue?: boolean) => {
      const idx = ONBOARDING_STEPS.indexOf(step)
      if (idx < ONBOARDING_STEPS.length - 1) {
        goToStep(ONBOARDING_STEPS[idx + 1] as OnboardingStep)
      }
    },
    [step, goToStep],
  )

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      <div className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          <StepIndicator current={step} />

          <div className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            {step === "profile" && <StepProfileNew data={data.profile} onNext={handleNext} />}
            {step === "jnv" && <StepJnv data={data.jnv} onNext={handleNext} />}
            {step === "interests" && <StepInterests data={data.interests} onNext={handleNext} />}
            {step === "membership" && <StepMembershipNew data={data.membership} onNext={handleNext} />}
            {step === "complete" && <StepCompleteNew />}
          </div>

          {step !== "complete" && (
            <p className="mt-6 text-center text-xs text-gray-400">
              You can leave and resume later. Your progress is saved automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
