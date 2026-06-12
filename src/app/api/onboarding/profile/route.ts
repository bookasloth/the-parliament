import { NextResponse } from "next/server"
// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"

export async function POST() {
  // const session = await auth()
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  // const { mobile, gender, dob, city, profession, bio } = await req.json()

  // try {
  //   const updates: Record<string, unknown> = {}

  //   if (mobile) {
  //     updates.mobileE164 = mobile
  //     updates.mobileVerifiedAt = null
  //   }
  //   if (gender) updates.gender = gender
  //   if (dob) updates.dateOfBirth = new Date(dob)
  //   if (city || profession || bio) {
  //     const profileUpdate: Record<string, unknown> = {}
  //     if (city) profileUpdate.city = city
  //     if (profession) profileUpdate.profession = profession
  //     if (bio !== undefined) profileUpdate.bio = bio

  //     if (Object.keys(profileUpdate).length > 0) {
  //       await prisma.profile.upsert({
  //         where: { userId: session.user.id },
  //         create: { userId: session.user.id, ...profileUpdate },
  //         update: profileUpdate,
  //       })
  //     }
  //   }

  //   const filledFields = [mobile, city, profession].filter(Boolean).length
  //   const completion = Math.min(Math.round((filledFields / 3) * 100), 100)
  //   updates.profileCompletion = completion
  //   updates.onboardingStep = "jnv"

  //   await prisma.user.update({
  //     where: { id: session.user.id },
  //     data: updates,
  //   })

  //   await prisma.onboardingProgress.upsert({
  //     where: { userId: session.user.id },
  //     create: {
  //       userId: session.user.id,
  //       step: "jnv",
  //       data: { profile: { mobile, gender, dob, city, profession, bio } },
  //     },
  //     update: {
  //       step: "jnv",
  //       data: { profile: { mobile, gender, dob, city, profession, bio } },
  //     },
  //   })

  //   return NextResponse.json({ success: true })
  // } catch (error) {
  //   console.error("Onboarding profile save error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock success for UI testing
  return NextResponse.json({ success: true })
}
