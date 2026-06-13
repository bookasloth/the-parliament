import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok } from "@/lib/api"
import { requireAdmin } from "@/lib/gate"
import { audit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200", 10), 1000)
    const suppressions = await prisma.emailSuppression.findMany({
      orderBy: { suppressedAt: "desc" },
      take: limit,
    })
    return ok({ suppressions })
  } catch (e) {
    return handleError(e)
  }
}

const removeSchema = z.object({
  emailAddress: z.email(),
  reason: z.string().min(3),
})

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = removeSchema.parse(await req.json())
    await prisma.emailSuppression.deleteMany({ where: { emailAddress: body.emailAddress.toLowerCase() } })
    await audit({
      actorId: admin.id,
      action: "email.suppression.remove",
      payload: body,
    })
    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
