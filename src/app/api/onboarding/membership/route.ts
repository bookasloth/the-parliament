import { NextResponse } from "next/server"
// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"

export async function POST() {
  // const session = await auth()
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  // const { selectedPlan } = await req.json()

  // try {
  //   const updates: Record<string, unknown> = {
  //     onboardingStep: "complete",
  //     membershipData: { selectedPlan },
  //   }

  //   await prisma.user.update({
  //     where: { id: session.user.id },
  //     data: updates,
  //   })

  //   await prisma.onboardingProgress.upsert({
  //     where: { userId: session.user.id },
  //     create: {
  //       userId: session.user.id,
  //       step: "complete",
  //       data: { membership: { selectedPlan } },
  //     },
  //     update: {
  //       step: "complete",
  //       data: { membership: { selectedPlan } },
  //     },
  //   })

  //   return NextResponse.json({ success: true })
  // } catch (error) {
  //   console.error("Onboarding membership save error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock success for UI testing
  return NextResponse.json({ success: true })
}
