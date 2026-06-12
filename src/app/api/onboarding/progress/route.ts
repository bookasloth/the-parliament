import { NextResponse } from "next/server"
// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"

export async function GET() {
  // const session = await auth()
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  // try {
  //   const user = await prisma.user.findUnique({
  //     where: { id: session.user.id },
  //     select: {
  //       onboardingStep: true,
  //       onboardingCompleted: true,
  //       profileCompletion: true,
  //     },
  //   })

  //   const progress = await prisma.onboardingProgress.findUnique({
  //     where: { userId: session.user.id },
  //   })

  //   return NextResponse.json({
  //     step: user?.onboardingStep || "profile",
  //     completed: user?.onboardingCompleted || false,
  //     profileCompletion: user?.profileCompletion || 0,
  //     savedData: progress?.data || {},
  //   })
  // } catch (error) {
  //   console.error("Onboarding progress error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock progress for UI testing
  return NextResponse.json({
    step: "profile",
    completed: false,
    profileCompletion: 0,
    savedData: {},
  })
}
