"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { StepIndicator } from "./StepIndicator"
import { StepProfile } from "./StepProfile"
import { StepWork } from "./StepWork"
import { StepFollow } from "./StepFollow"
import { StepPlan } from "./StepPlan"
import { StepIntro } from "./StepIntro"
import { OnboardingPreview } from "./OnboardingPreview"
import { reachedStep } from "@/app/(onboarding)/onboarding/actions"
import type { SuggestedPerson } from "@/modules/onboarding/suggestions"
import {
  EMPTY_ONBOARDING,
  ONBOARDING_STEPS,
  STEP_INDEX,
  buildIntroPost,
  type OnboardingData,
  type OnboardingStep,
} from "@/lib/onboarding"

interface OnboardingWizardProps {
  currentStep: OnboardingStep
  memberName: string
  email: string
  houseName: string | null
  houseColor: string | null
  batchLabel: string | null
  initialUsername: string
  initialPhotoUrl: string
  suggestions: SuggestedPerson[]
}

export function OnboardingWizard(props: OnboardingWizardProps) {
  const { currentStep, memberName, houseName, houseColor, batchLabel, suggestions } = props
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>(
    ONBOARDING_STEPS.includes(currentStep) ? currentStep : "profile",
  )
  const [data, setData] = useState<OnboardingData>(() => ({
    ...EMPTY_ONBOARDING,
    profile: { ...EMPTY_ONBOARDING.profile, username: props.initialUsername, photoUrl: props.initialPhotoUrl },
  }))

  const patch = useCallback(
    <K extends keyof OnboardingData>(key: K, part: Partial<OnboardingData[K]>) => {
      setData((prev) => ({ ...prev, [key]: { ...prev[key], ...part } }))
    },
    [],
  )

  const goTo = useCallback((next: OnboardingStep) => {
    setStep(next)
    router.replace(`/onboarding/${next}`, { scroll: false })
  }, [router])

  const next = useCallback(() => {
    const i = ONBOARDING_STEPS.indexOf(step)
    if (i < ONBOARDING_STEPS.length - 1) goTo(ONBOARDING_STEPS[i + 1])
  }, [step, goTo])

  // Skip advances without saving, but records the furthest step server-side.
  const skip = useCallback(() => {
    const i = ONBOARDING_STEPS.indexOf(step)
    const nextStep = ONBOARDING_STEPS[Math.min(i + 1, ONBOARDING_STEPS.length - 1)]
    void reachedStep(nextStep)
    goTo(nextStep)
  }, [step, goTo])

  // Draft the intro once the details are in.
  const introText = useMemo(
    () => data.intro.text || buildIntroPost(data, { name: memberName, houseName: houseName ?? undefined, batchLabel: batchLabel ?? undefined }),
    [data, memberName, houseName, batchLabel],
  )

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Left — form */}
      <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 sm:py-12">
        <div className="w-full max-w-xl">
          <StepIndicator current={step} />
          <div className="mt-8">
            {step === "profile" && <StepProfile data={data.profile} set={(p) => patch("profile", p)} onNext={next} />}
            {step === "work" && <StepWork data={data.work} set={(p) => patch("work", p)} onNext={next} onSkip={skip} />}
            {step === "follow" && <StepFollow suggestions={suggestions} data={data.follow} set={(p) => patch("follow", p)} onNext={next} onSkip={skip} />}
            {step === "plan" && <StepPlan data={data.plan} set={(p) => patch("plan", p)} onNext={next} onSkip={skip} />}
            {step === "intro" && <StepIntro text={introText} set={(p) => patch("intro", p)} />}
          </div>
        </div>
      </div>

      {/* Right — live preview panel */}
      <div className="relative flex items-center justify-center overflow-hidden bg-[#0b1020] px-8 py-10 lg:w-2/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,rgba(91,157,255,0.14),transparent_60%)]" />
        <div className="relative">
          <OnboardingPreview
            data={{ ...data, intro: { text: introText } }}
            step={step}
            memberName={memberName}
            houseName={houseName}
            houseColor={houseColor}
            batchLabel={batchLabel}
          />
        </div>
      </div>
    </div>
  )
}
