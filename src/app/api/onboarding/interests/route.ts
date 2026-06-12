import { NextResponse } from "next/server"
// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"

// const VALID_INTERESTS = [
//   "mentorship", "networking", "jobs", "business",
//   "events", "donations", "volunteering",
// ]

export async function POST() {
  // const session = await auth()
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  // const { interestIds } = await req.json()

  // if (!Array.isArray(interestIds)) {
  //   return NextResponse.json({ error: "interestIds must be an array" }, { status: 400 })
  // }

  // const valid = interestIds.filter((id: string) => VALID_INTERESTS.includes(id))

  // try {
  //   const existingInterests = await prisma.interest.findMany({
  //     where: { slug: { in: valid } },
  //   })

  //   const interestMap = new Map(existingInterests.map((i) => [i.slug, i.id]))
  //   const missingSlugs = valid.filter((s: string) => !interestMap.has(s))

  //   for (const slug of missingSlugs) {
  //     const name = VALID_INTERESTS.find((v) => v === slug) || slug
  //     const created = await prisma.interest.create({
  //       data: { name: name.charAt(0).toUpperCase() + name.slice(1), slug },
  //     })
  //     interestMap.set(slug, created.id)
  //   }

  //   const interestIdsToAdd = valid.map((slug: string) => interestMap.get(slug)).filter(Boolean) as string[]

  //   await prisma.userInterest.deleteMany({
  //     where: { userId: session.user.id },
  //   })

  //   if (interestIdsToAdd.length > 0) {
  //     await prisma.userInterest.createMany({
  //       data: interestIdsToAdd.map((interestId: string) => ({
  //         userId: session.user.id,
  //         interestId,
  //       })),
  //     })
  //   }

  //   await prisma.user.update({
  //     where: { id: session.user.id },
  //     data: { onboardingStep: "membership" },
  //   })

  //   await prisma.onboardingProgress.upsert({
  //     where: { userId: session.user.id },
  //     create: {
  //       userId: session.user.id,
  //       step: "membership",
  //       data: { interests: { interestIds: valid } },
  //     },
  //     update: {
  //       step: "membership",
  //       data: { interests: { interestIds: valid } },
  //     },
  //   })

  //   return NextResponse.json({ success: true })
  // } catch (error) {
  //   console.error("Onboarding interests save error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock success for UI testing
  return NextResponse.json({ success: true })
}
