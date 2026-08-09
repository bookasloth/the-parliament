import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { optionalUser } from "@/modules/auth/session"
import { getRazorpay, publicKeyId } from "@/lib/razorpay"
import { validateContribution } from "@/config/sponsor"

const schema = z.object({
  kind: z.enum(["individual", "company"]),
  amountPaise: z.number().int().positive(),
  // Wall opt-in
  showOnWall: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  displayName: z.string().trim().min(1).max(80), // always needed — every giver gets a certificate
  websiteUrl: z.string().trim().url().max(200).optional(),
  logoUrl: z.string().trim().url().max(300).optional(),
  message: z.string().trim().max(280).optional(),
  email: z.string().trim().email().max(200).optional(),
})

/**
 * POST /api/contribute/checkout — start a Razorpay order for a public
 * contribution to NNAWCA (the association). No login required. Creates a pending
 * Contribution row; a verified payment flips it to "paid". Wall display is
 * opt-in and admin-approved before it surfaces.
 */
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    // Server-side floor + tier — never trust the client.
    const v = validateContribution(body.kind, body.amountPaise)
    if (!v.ok) return badRequest(v.error)

    const me = await optionalUser().catch(() => null)

    const contribution = await prisma.contribution.create({
      data: {
        amountPaise: body.amountPaise,
        tier: v.tier,
        kind: body.kind,
        userId: me?.id ?? null,
        showOnWall: body.showOnWall,
        isAnonymous: body.isAnonymous,
        displayName: body.displayName, // stored always; isAnonymous only hides it from the public wall
        websiteUrl: body.websiteUrl ?? null,
        logoUrl: body.kind === "company" ? body.logoUrl ?? null : null,
        message: body.message ?? null,
        email: body.email ?? null,
        status: "pending",
      },
      select: { id: true },
    })

    const order = await getRazorpay().orders.create({
      amount: body.amountPaise,
      currency: "INR",
      receipt: `contrib_${contribution.id.replace(/-/g, "").slice(0, 24)}`.slice(0, 40),
      notes: { kind: "contribution", contributionId: contribution.id, tier: v.tier },
    })

    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { razorpayOrderId: order.id },
    })

    return ok({
      contributionId: contribution.id,
      razorpayOrderId: order.id,
      amountPaise: body.amountPaise,
      currency: "INR",
      keyId: publicKeyId(),
    })
  } catch (e) {
    return handleError(e)
  }
}
