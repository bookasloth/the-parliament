import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding"

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>
}) {
  const { step } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }
  if (session.user.onboardingCompleted) {
    redirect("/feed")
  }

  const current = (ONBOARDING_STEPS.includes(step as OnboardingStep)
    ? step
    : ONBOARDING_STEPS[0]) as OnboardingStep

  return (
    <OnboardingWizard
      currentStep={current}
      email={session.user.email ?? undefined}
      memberName={session.user.name ?? undefined}
    />
  )
}
