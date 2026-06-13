import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleError, ok } from "@/lib/api"
import { requireAdmin } from "@/lib/gate"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const url = new URL(req.url)
    const status = url.searchParams.get("status") || undefined
    const category = url.searchParams.get("category") || undefined
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500)

    const messages = await prisma.emailMessage.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { queuedAt: "desc" },
      take: limit,
    })
    return ok({ messages })
  } catch (e) {
    return handleError(e)
  }
}
