// Auth commented out for UI testing — onboarding is public
// import { auth } from "@/lib/auth"
// import { redirect } from "next/navigation"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import type { OnboardingStep } from "@/lib/onboarding"
// import { ONBOARDING_STEPS } from "@/lib/onboarding"

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>
}) {
  const { step } = await params
  // const session = await auth()

  // if (!session?.user?.id) {
  //   redirect("/auth/signin")
  // }

  // if (session.user.onboardingCompleted) {
  //   redirect("/feed")
  // }

  // const isValidStep = ONBOARDING_STEPS.includes(step as OnboardingStep)
  // if (!isValidStep) {
  //   redirect(`/onboarding/${session.user.onboardingStep || "profile"}`)
  // }

  // const userStep = session.user.onboardingStep || "profile"
  // const requestedIdx = ONBOARDING_STEPS.indexOf(step as OnboardingStep)
  // const userIdx = ONBOARDING_STEPS.indexOf(userStep as OnboardingStep)

  // if (requestedIdx > userIdx && step !== "complete") {
  //   redirect(`/onboarding/${userStep}`)
  // }

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <OnboardingWizard currentStep={step as OnboardingStep} />
    </div>
  )
}
