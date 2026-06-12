import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ schools })
  } catch (error) {
    console.error("Schools fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
