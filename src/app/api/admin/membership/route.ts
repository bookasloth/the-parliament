import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok } from "@/lib/api"
import { requireAdmin } from "@/lib/gate"
import {
  adminExtend,
  adminGrant,
  adminRefund,
  adminRevoke,
  getMembershipStats,
  inviteToCommittee,
} from "@/modules/membership/admin"

const grantSchema = z.object({
  action: z.literal("grant"),
  targetUserId: z.string().uuid(),
  planCode: z.enum(["associate", "premium", "life"]),
})

const extendSchema = z.object({
  action: z.literal("extend"),
  membershipId: z.string().uuid(),
  newEndsAt: z.iso.datetime(),
  reason: z.string().min(3),
})

const revokeSchema = z.object({
  action: z.literal("revoke"),
  membershipId: z.string().uuid(),
  reason: z.string().min(3),
})

const refundSchema = z.object({
  action: z.literal("refund"),
  orderId: z.string().uuid(),
  razorpayRefundId: z.string(),
  amountPaise: z.number().int().positive(),
  reason: z.string().min(3),
})

const committeeSchema = z.object({
  action: z.literal("invite_committee"),
  targetUserId: z.string().uuid(),
  message: z.string().optional(),
})

const schema = z.discriminatedUnion("action", [
  grantSchema,
  extendSchema,
  revokeSchema,
  refundSchema,
  committeeSchema,
])

export async function GET() {
  try {
    await requireAdmin()
    const stats = await getMembershipStats()
    return ok({ stats })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = schema.parse(await req.json())

    if (body.action === "grant") {
      const r = await adminGrant({ adminId: admin.id, targetUserId: body.targetUserId, planCode: body.planCode })
      return ok({ membershipId: r.membershipId })
    }
    if (body.action === "extend") {
      await adminExtend({ adminId: admin.id, membershipId: body.membershipId, newEndsAt: new Date(body.newEndsAt), reason: body.reason })
      return ok({ success: true })
    }
    if (body.action === "revoke") {
      await adminRevoke({ adminId: admin.id, membershipId: body.membershipId, reason: body.reason })
      return ok({ success: true })
    }
    if (body.action === "refund") {
      const r = await adminRefund({ adminId: admin.id, orderId: body.orderId, razorpayRefundId: body.razorpayRefundId, amountPaise: body.amountPaise, reason: body.reason })
      return ok({ refundId: r.id })
    }
    if (body.action === "invite_committee") {
      const r = await inviteToCommittee({ superAdminId: admin.id, targetUserId: body.targetUserId, message: body.message })
      return ok({ inviteId: r.id, expiresAt: r.expiresAt })
    }
    return ok({ ignored: true })
  } catch (e) {
    return handleError(e)
  }
}
