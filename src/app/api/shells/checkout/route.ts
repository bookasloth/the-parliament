import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { buildReceipt, getRazorpay, publicKeyId } from "@/lib/razorpay"
import { SHELL_PACKS, type ShellPackId } from "@/modules/economy/shells"

const schema = z.object({
  packId: z.string(),
})

/** POST /api/shells/checkout — create a Razorpay order for a shell pack. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { packId } = schema.parse(await req.json())

    const pack = SHELL_PACKS.find((p) => p.id === packId)
    if (!pack) return badRequest("Unknown pack")

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, legalName: true },
    })
    if (!dbUser) return badRequest("User not found")

    const rzp = getRazorpay()
    const rzpOrder = await rzp.orders.create({
      amount: pack.pricePaise,
      currency: "INR",
      receipt: buildReceipt(user.id),
      notes: { userId: user.id, kind: "shell_pack", packId: pack.id },
    })

    return ok({
      packId: pack.id as ShellPackId,
      shells: pack.shells,
      razorpayOrderId: rzpOrder.id,
      amountPaise: pack.pricePaise,
      currency: "INR",
      keyId: publicKeyId(),
      customer: { name: dbUser.legalName, email: dbUser.email },
    })
  } catch (e) {
    return handleError(e)
  }
}
