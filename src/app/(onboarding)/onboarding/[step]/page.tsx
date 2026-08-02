import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import { getFollowSuggestions } from "@/modules/onboarding/suggestions"
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding"

export const dynamic = "force-dynamic"

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>
}) {
  const { step } = await params
  const session = await auth()

  if (!session?.user?.id) redirect("/auth/signin")
  if (session.user.onboardingCompleted) redirect("/feed")

  const current = (ONBOARDING_STEPS.includes(step as OnboardingStep) ? step : ONBOARDING_STEPS[0]) as OnboardingStep

  const [user, suggestions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        legalName: true, displayName: true, email: true, username: true,
        profile: {
          select: {
            photoUrl: true,
            house: { select: { name: true, colorHex: true } },
            batch: { select: { label: true, startYear: true, endYear: true } },
          },
        },
      },
    }),
    getFollowSuggestions(session.user.id),
  ])

  const p = user?.profile
  const batchLabel = p?.batch ? p.batch.label || `${p.batch.startYear}–${p.batch.endYear}` : null

  return (
    <OnboardingWizard
      currentStep={current}
      email={user?.email ?? session.user.email ?? ""}
      memberName={user?.displayName || user?.legalName || "there"}
      houseName={p?.house?.name ?? null}
      houseColor={p?.house?.colorHex ?? null}
      batchLabel={batchLabel}
      initialUsername={user?.username ?? ""}
      initialPhotoUrl={p?.photoUrl ?? ""}
      suggestions={suggestions}
    />
  )
}
