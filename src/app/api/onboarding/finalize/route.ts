import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { createPost } from "@/modules/feed/posts"
import { markComplete } from "@/modules/onboarding/service"
import { handleError, ok, badRequest } from "@/lib/api"
import { INTEREST_OPTIONS, MONTHS } from "@/lib/onboarding"

const schema = z.object({
  work: z.object({
    company: z.string().trim().max(160).optional().default(""),
    position: z.string().trim().max(160).optional().default(""),
    sinceYear: z.string().optional().default(""),
    sinceMonth: z.string().optional().default(""),
    sinceDay: z.string().optional().default(""),
  }),
  media: z.object({
    photoUrl: z.string().optional().default(""),
    coverUrl: z.string().optional().default(""),
    bio: z.string().trim().max(2000).optional().default(""),
    bloodGroup: z.string().max(5).optional().default(""),
    willingToDonate: z.boolean().optional().default(false),
  }),
  interests: z.object({ interestIds: z.array(z.string()).default([]) }),
  introText: z.string().trim().optional().default(""),
})

// Only persist real (already-uploaded) URLs — client previews are blob: URLs.
const realUrl = (u: string) => (u && !u.startsWith("blob:") ? u : null)

function buildWorkSince(year: string, month: string, day: string): Date | null {
  if (!year) return null
  const m = month ? Math.max(0, MONTHS.indexOf(month as (typeof MONTHS)[number])) : 0
  const d = day ? Number(day) : 1
  // UTC so the date-only column doesn't shift a day by server timezone.
  return new Date(Date.UTC(Number(year), m, d))
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()

    // Gate: email must be verified (server-side, not just client state).
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    })
    if (!row?.emailVerifiedAt) return badRequest("Verify your email before finishing")

    const { work, media, interests, introText } = schema.parse(await req.json())
    const schoolId = await getDefaultSchoolId()

    // 1. Profile.
    const profileData = {
      company: work.company || null,
      designation: work.position || null,
      workSince: buildWorkSince(work.sinceYear, work.sinceMonth, work.sinceDay),
      bio: media.bio || null,
      bloodGroup: media.bloodGroup || null,
      bloodDonor: media.willingToDonate,
      photoUrl: realUrl(media.photoUrl),
      coverUrl: realUrl(media.coverUrl),
    }
    await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...profileData },
      update: profileData,
    })

    // 2. Interests — upsert catalog by slug, then link to the user.
    if (interests.interestIds.length) {
      const linked = await Promise.all(
        interests.interestIds.map(async (slug) => {
          const name = INTEREST_OPTIONS.find((i) => i.slug === slug)?.name ?? slug
          const interest = await prisma.interest.upsert({
            where: { slug },
            create: { slug, name },
            update: {},
            select: { id: true },
          })
          return interest.id
        }),
      )
      await prisma.userInterest.createMany({
        data: linked.map((interestId) => ({ userId: user.id, interestId })),
        skipDuplicates: true,
      })
    }

    // 3. Intro post (best-effort — don't fail onboarding if the post can't post).
    let posted = false
    if (introText && schoolId) {
      try {
        await createPost({
          authorId: user.id,
          schoolId,
          categoryKey: "career_update",
          format: "text",
          body: introText,
        })
        posted = true
      } catch {
        posted = false
      }
    }

    // 4. Mark onboarding complete.
    await markComplete(user.id)

    return ok({ completed: true, posted })
  } catch (e) {
    return handleError(e)
  }
}
