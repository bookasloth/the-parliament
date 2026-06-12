import { NextResponse } from "next/server"
// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"

export async function POST() {
  // const session = await auth()
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  // try {
  //   await prisma.user.update({
  //     where: { id: session.user.id },
  //     data: {
  //       onboardingCompleted: true,
  //       onboardingStep: "complete",
  //       profileCompletion: 100,
  //     },
  //   })

  //   await prisma.onboardingProgress.upsert({
  //     where: { userId: session.user.id },
  //     create: {
  //       userId: session.user.id,
  //       step: "complete",
  //       completed: true,
  //       data: { completedAt: new Date().toISOString() },
  //     },
  //     update: {
  //       completed: true,
  //       data: { completedAt: new Date().toISOString() },
  //     },
  //   })

  //   return NextResponse.json({ success: true })
  // } catch (error) {
  //   console.error("Onboarding complete error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock success for UI testing
  return NextResponse.json({ success: true })
}
