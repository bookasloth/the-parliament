import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { handleError, ok } from "@/lib/api"
import { saveStep } from "@/modules/onboarding/service"

const schema = z.object({
  schoolId: z.string().uuid(),
  batchYear: z.string().optional(),
  houseId: z.string().uuid().optional(),
  yearsStudied: z.string().optional(),
  currentStatus: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const data = schema.parse(await req.json())

    const userUpdate: Record<string, unknown> = {
      schoolId: data.schoolId,
      currentStatus: data.currentStatus || "alumni",
    }
    if (data.yearsStudied) userUpdate.yearsStudied = parseInt(data.yearsStudied, 10)

    await prisma.user.update({ where: { id: user.id }, data: userUpdate })

    const profileData: Record<string, unknown> = {}
    if (data.houseId) profileData.houseId = data.houseId
    if (data.batchYear) {
      const batch = await prisma.batch.findFirst({
        where: { schoolId: data.schoolId, label: data.batchYear },
      })
      if (batch) profileData.batchId = batch.id
    }

    if (Object.keys(profileData).length > 0) {
      await prisma.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profileData },
        update: profileData,
      })
    }

    await ensureDefaultDivision(user.id, data.schoolId)
    await saveStep(user.id, "jnv", data)

    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}

async function ensureDefaultDivision(userId: string, schoolId: string) {
  const def = await prisma.division.findFirst({
    where: { schoolId, isDefault: true },
  })
  if (!def) return
  await prisma.userDivision.upsert({
    where: { userId_divisionId: { userId, divisionId: def.id } },
    create: { userId, divisionId: def.id, isProtected: true },
    update: { isProtected: true },
  })
}
