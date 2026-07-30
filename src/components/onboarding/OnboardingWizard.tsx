"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { StepIndicator } from "./StepIndicator"
import { HousePanel } from "./HousePanel"
import { StepVerify } from "./StepVerify"
import { StepWork } from "./StepWork"
import { StepMedia } from "./StepMedia"
import { StepInterests } from "./StepInterests"
import { StepIntro } from "./StepIntro"
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
  memberName?: string
  email?: string
}

export function OnboardingWizard({ currentStep, memberName, email }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>(
    ONBOARDING_STEPS.includes(currentStep) ? currentStep : "verify",
  )
  const [data, setData] = useState<OnboardingData>(() => ({
    ...EMPTY_ONBOARDING,
    verify: { ...EMPTY_ONBOARDING.verify, email: email ?? "" },
  }))

  const idx = STEP_INDEX[step]

  const patch = useCallback(
    <K extends keyof OnboardingData>(key: K, part: Partial<OnboardingData[K]>) => {
      setData((prev) => ({ ...prev, [key]: { ...prev[key], ...part } }))
    },
    [],
  )

  const goTo = useCallback(
    (next: OnboardingStep) => {
      setStep(next)
      router.replace(`/onboarding/${next}`, { scroll: false })
    },
    [router],
  )

  const next = useCallback(() => {
    const i = ONBOARDING_STEPS.indexOf(step)
    if (i < ONBOARDING_STEPS.length - 1) goTo(ONBOARDING_STEPS[i + 1])
  }, [step, goTo])

  // Draft the intro when the member lands on the last step.
  const introText = useMemo(
    () => data.intro.text || buildIntroPost(data, { name: memberName }),
    [data, memberName],
  )

  // Persist everything + create the intro post + mark onboarding complete.
  const finalize = useCallback(
    async (text: string) => {
      const res = await fetch("/api/onboarding/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work: data.work,
          media: data.media,
          interests: data.interests,
          introText: text,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || "Couldn't finish onboarding")
      }
    },
    [data],
  )

  return (
    <div className="flex min-h-screen bg-[#f3f2ef]">
      {/* Left — process (60%) */}
      <div className="flex w-full flex-col lg:w-3/5">
        <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 sm:py-12">
          <div className="w-full max-w-xl">
            <StepIndicator current={step} />

            <div className="mt-8">
              {step === "verify" && (
                <StepVerify email={email ?? data.verify.email} onVerified={next} />
              )}
              {step === "work" && (
                <StepWork data={data.work} set={(p) => patch("work", p)} onNext={next} />
              )}
              {step === "media" && (
                <StepMedia data={data.media} set={(p) => patch("media", p)} onNext={next} />
              )}
              {step === "interests" && (
                <StepInterests data={data.interests} set={(p) => patch("interests", p)} onNext={next} />
              )}
              {step === "intro" && (
                <StepIntro
                  text={introText}
                  set={(p) => patch("intro", p)}
                  onPublish={finalize}
                />
              )}
            </div>

            {step !== "intro" && (
              <p className="mt-8 text-center text-xs text-gray-400">
                You can leave and resume later — your progress is saved.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right — house-colour panel (40%) */}
      <HousePanel stepIndex={idx} />
    </div>
  )
}
