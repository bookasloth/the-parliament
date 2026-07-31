import { NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { handleError, ok } from "@/lib/api"
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding"

const schema = z.object({
  step: z.enum(ONBOARDING_STEPS),
  // Cap the free-form blob so it can't be used as an unbounded per-user storage
  // sink. 20 KB is generous for onboarding form data.
  data: z
    .record(z.string(), z.unknown())
    .refine((d) => JSON.stringify(d).length <= 20_000, { message: "Onboarding payload too large" }),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { step, data: stepData } = schema.parse(await req.json())

    const existing = await prisma.onboardingProgress.findUnique({
      where: { userId: user.id },
    })
    const merged = {
      ...((existing?.data as Record<string, unknown>) ?? {}),
      [step]: stepData,
    } as Prisma.InputJsonValue

    await prisma.onboardingProgress.upsert({
      where: { userId: user.id },
      create: { userId: user.id, step: step as OnboardingStep, data: merged },
      update: { data: merged },
    })

    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
