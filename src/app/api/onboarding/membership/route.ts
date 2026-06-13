import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { handleError, ok } from "@/lib/api"
import { saveStep } from "@/modules/onboarding/service"

const schema = z.object({
  selectedPlan: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { selectedPlan } = schema.parse(await req.json())

    await prisma.user.update({
      where: { id: user.id },
      data: { membershipData: selectedPlan ? { selectedPlan } : undefined },
    })

    await saveStep(user.id, "membership", { selectedPlan: selectedPlan ?? null })
    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
