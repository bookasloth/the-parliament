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
  //     select: { schoolId: true },
  //   })

  //   const plans = await prisma.membershipPlan.findMany({
  //     where: {
  //       schoolId: user?.schoolId || undefined,
  //       isActive: true,
  //     },
  //     orderBy: { priceInr: "asc" },
  //   })

  //   return NextResponse.json({ plans })
  // } catch (error) {
  //   console.error("Membership plans error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock empty plans for UI testing
  return NextResponse.json({ plans: [] })
}
