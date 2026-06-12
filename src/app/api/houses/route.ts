import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const houses = await prisma.house.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ houses })
  } catch (error) {
    console.error("Houses fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
