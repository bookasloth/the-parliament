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

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const uuids = interestIds.filter((s) => UUID_RE.test(s))
    const slugs = interestIds.filter((s) => !UUID_RE.test(s))
    const interests = await prisma.interest.findMany({
      where: { OR: [{ id: { in: uuids } }, { slug: { in: slugs } }] },
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
