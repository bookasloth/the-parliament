import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { handleError, ok } from "@/lib/api"
import { saveStep } from "@/modules/onboarding/service"

const schema = z.object({
  interestIds: z.array(z.string()),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { interestIds } = schema.parse(await req.json())

    const interests = await prisma.interest.findMany({
      where: { OR: [{ id: { in: interestIds } }, { slug: { in: interestIds } }] },
      select: { id: true },
    })
    const validIds = interests.map((i) => i.id)

    await prisma.userInterest.deleteMany({ where: { userId: user.id } })
    if (validIds.length > 0) {
      await prisma.userInterest.createMany({
        data: validIds.map((interestId) => ({ userId: user.id, interestId })),
      })
    }

    await saveStep(user.id, "interests", { interestIds: validIds })
    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
