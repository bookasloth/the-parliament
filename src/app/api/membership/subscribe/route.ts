import { NextResponse } from "next/server"
// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"

export async function POST() {
  // const session = await auth()
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  // const { plan } = await req.json()

  // if (!plan || !["annual", "lifetime"].includes(plan)) {
  //   return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  // }

  // try {
  //   const user = await prisma.user.findUnique({
  //     where: { id: session.user.id },
  //     select: { schoolId: true },
  //   })

  //   if (!user?.schoolId) {
  //     return NextResponse.json({ error: "School not set" }, { status: 400 })
  //   }

  //   const membershipPlan = await prisma.membershipPlan.findFirst({
  //     where: {
  //       schoolId: user.schoolId,
  //       tier: plan,
  //       isActive: true,
  //     },
  //   })

  //   if (!membershipPlan) {
  //     return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  //   }

  //   return NextResponse.json({
  //     planId: membershipPlan.id,
  //     name: membershipPlan.name,
  //     price: membershipPlan.priceInr,
  //     currency: "INR",
  //   })
  // } catch (error) {
  //   console.error("Membership subscribe error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock success for UI testing
  return NextResponse.json({ success: true })
}
