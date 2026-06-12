import { NextResponse } from "next/server"
// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"

export async function POST() {
  // const session = await auth()
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  // const { schoolId, batchYear, houseId, yearsStudied, currentStatus } = await req.json()

  // if (!schoolId) {
  //   return NextResponse.json({ error: "School is required" }, { status: 400 })
  // }

  // try {
  //   const userUpdate: Record<string, unknown> = {
  //     schoolId,
  //     currentStatus: currentStatus || "alumni",
  //     onboardingStep: "interests",
  //   }

  //   if (yearsStudied) userUpdate.yearsStudied = parseInt(yearsStudied, 10)

  //   const profileUpdate: Record<string, unknown> = {}

  //   if (houseId) profileUpdate.houseId = houseId
  //   if (batchYear) {
  //     const batch = await prisma.batch.findFirst({
  //       where: { schoolId, label: batchYear },
  //     })
  //     if (batch) profileUpdate.batchId = batch.id
  //   }

  //   if (Object.keys(profileUpdate).length > 0) {
  //     await prisma.profile.upsert({
  //       where: { userId: session.user.id },
  //       create: { userId: session.user.id, ...profileUpdate },
  //       update: profileUpdate,
  //     })
  //   }

  //   await prisma.user.update({
  //     where: { id: session.user.id },
  //     data: userUpdate,
  //   })

  //   await prisma.onboardingProgress.upsert({
  //     where: { userId: session.user.id },
  //     create: {
  //       userId: session.user.id,
  //       step: "interests",
  //       data: { jnv: { schoolId, batchYear, houseId, yearsStudied, currentStatus } },
  //     },
  //     update: {
  //       step: "interests",
  //       data: { jnv: { schoolId, batchYear, houseId, yearsStudied, currentStatus } },
  //     },
  //   })

  //   return NextResponse.json({ success: true })
  // } catch (error) {
  //   console.error("Onboarding JNV save error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock success for UI testing
  return NextResponse.json({ success: true })
}
