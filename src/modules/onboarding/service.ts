import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding"

export function nextStep(current: OnboardingStep): OnboardingStep {
  const idx = ONBOARDING_STEPS.indexOf(current)
  return ONBOARDING_STEPS[Math.min(idx + 1, ONBOARDING_STEPS.length - 1)]
}

export async function getProgress(userId: string) {
  const [user, progress] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingStep: true,
        onboardingCompleted: true,
        profileCompletion: true,
      },
    }),
    prisma.onboardingProgress.findUnique({ where: { userId } }),
  ])

  return {
    step: (user?.onboardingStep || "profile") as OnboardingStep,
    completed: user?.onboardingCompleted ?? false,
    profileCompletion: user?.profileCompletion ?? 0,
    savedData: (progress?.data as Record<string, unknown>) ?? {},
  }
}

export async function saveStep(
  userId: string,
  step: OnboardingStep,
  stepData: Record<string, unknown>,
) {
  const next = nextStep(step)

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingStep: next },
  })

  const existing = await prisma.onboardingProgress.findUnique({
    where: { userId },
  })
  const mergedData = {
    ...((existing?.data as Record<string, unknown>) ?? {}),
    [step]: stepData,
  }

  const data = mergedData as Prisma.InputJsonValue
  await prisma.onboardingProgress.upsert({
    where: { userId },
    create: { userId, step: next, data },
    update: { step: next, data },
  })

  return { next }
}

export async function markComplete(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      onboardingStep: "complete",
      profileCompletion: 100,
    },
  })

  await prisma.onboardingProgress.upsert({
    where: { userId },
    create: {
      userId,
      step: "complete",
      completed: true,
      data: { completedAt: new Date().toISOString() },
    },
    update: {
      step: "complete",
      completed: true,
    },
  })
}
