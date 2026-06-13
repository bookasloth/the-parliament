import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { handleError, ok } from "@/lib/api"
import { saveStep } from "@/modules/onboarding/service"

const schema = z.object({
  mobile: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  city: z.string().optional(),
  profession: z.string().optional(),
  bio: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const data = schema.parse(await req.json())

    const userUpdate: Record<string, unknown> = {}
    if (data.mobile) userUpdate.mobileE164 = data.mobile
    if (data.gender) userUpdate.gender = data.gender
    if (data.dob) userUpdate.dateOfBirth = new Date(data.dob)

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data: userUpdate })
    }

    if (data.city || data.profession || data.bio !== undefined) {
      const profileData: Record<string, unknown> = {}
      if (data.city) profileData.city = data.city
      if (data.profession) profileData.profession = data.profession
      if (data.bio !== undefined) profileData.bio = data.bio

      await prisma.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profileData },
        update: profileData,
      })
    }

    const filled = [data.mobile, data.city, data.profession, data.gender, data.dob, data.bio].filter(Boolean).length
    await prisma.user.update({
      where: { id: user.id },
      data: { profileCompletion: Math.min(Math.round((filled / 6) * 100), 100) },
    })

    await saveStep(user.id, "profile", data)
    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
