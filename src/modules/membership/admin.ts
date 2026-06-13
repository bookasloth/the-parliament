import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import {
  COMMITTEE_DEFAULT_TENURE_YEARS,
  COMMITTEE_INVITE_TTL_DAYS,
  PLANS,
  type PlanCode,
} from "@/config/membership"
import { activateMembership, expireMembership } from "@/modules/membership/activation"
import { audit } from "@/lib/audit"
import { sendNotification } from "@/modules/notifications/service"

export interface GrantInput {
  adminId: string
  targetUserId: string
  planCode: PlanCode
  endsAt?: Date
}

export async function adminGrant(input: GrantInput) {
  const def = PLANS[input.planCode]
  if (!def) throw new ForbiddenError(`Unknown plan: ${input.planCode}`)
  if (input.planCode === "committee") {
    throw new ForbiddenError("Use inviteToCommittee for committee membership")
  }

  return activateMembership({
    userId: input.targetUserId,
    planCode: input.planCode,
    source: "admin_grant",
    amountPaise: 0,
    grantedByUserId: input.adminId,
  })
}

export async function adminExtend(input: { adminId: string; membershipId: string; newEndsAt: Date; reason: string }) {
  const m = await prisma.membership.findUnique({ where: { id: input.membershipId } })
  if (!m) throw new ForbiddenError("Membership not found")
  if (m.status !== "active") throw new ForbiddenError("Membership not active")

  await prisma.membership.update({
    where: { id: m.id },
    data: { endsAt: input.newEndsAt },
  })
  await prisma.user.update({
    where: { id: m.userId },
    data: { membershipExpiresAt: input.newEndsAt },
  })
  await prisma.membershipEvent.create({
    data: {
      userId: m.userId,
      type: "extended",
      newPlan: m.planCode,
      actorUserId: input.adminId,
      metadata: { reason: input.reason, newEndsAt: input.newEndsAt.toISOString() },
    },
  })
  await audit({
    actorId: input.adminId,
    action: "membership.admin.extend",
    entityType: "membership",
    entityId: m.id,
    payload: { newEndsAt: input.newEndsAt.toISOString(), reason: input.reason },
  })
}

export async function adminRevoke(input: { adminId: string; membershipId: string; reason: string }) {
  const m = await prisma.membership.findUnique({ where: { id: input.membershipId } })
  if (!m) throw new ForbiddenError("Membership not found")
  await expireMembership(m.id, input.adminId)
  await audit({
    actorId: input.adminId,
    action: "membership.admin.revoke",
    entityType: "membership",
    entityId: m.id,
    payload: { reason: input.reason },
  })
}

export async function adminRefund(input: { adminId: string; orderId: string; reason: string; razorpayRefundId: string; amountPaise: number }) {
  const order = await prisma.membershipOrder.findUnique({ where: { id: input.orderId } })
  if (!order) throw new ForbiddenError("Order not found")

  const refund = await prisma.membershipRefund.create({
    data: {
      orderId: order.id,
      razorpayRefundId: input.razorpayRefundId,
      amountPaise: input.amountPaise,
      reason: input.reason,
      status: "pending",
      initiatedByUserId: input.adminId,
    },
  })

  await prisma.membershipOrder.update({
    where: { id: order.id },
    data: { status: "refunded" },
  })

  const laterPaid = await prisma.membership.findFirst({
    where: { userId: order.userId, status: "active", startedAt: { gt: order.createdAt } },
  })
  if (!laterPaid) {
    const m = await prisma.membership.findFirst({
      where: { orderId: order.id, status: "active" },
    })
    if (m) await expireMembership(m.id, input.adminId)
  }

  await audit({
    actorId: input.adminId,
    action: "membership.admin.refund",
    entityType: "membership_order",
    entityId: order.id,
    payload: { refundId: refund.id, reason: input.reason },
  })

  return refund
}

export async function inviteToCommittee(input: { superAdminId: string; targetUserId: string; message?: string }) {
  const admin = await prisma.user.findUnique({ where: { id: input.superAdminId }, select: { isSuperAdmin: true } })
  if (!admin?.isSuperAdmin) throw new ForbiddenError("Only super-admins can invite to Committee")

  const targetMembership = await prisma.membership.findFirst({
    where: { userId: input.targetUserId, status: "active", planCode: "life" },
  })
  if (!targetMembership) {
    throw new ForbiddenError("Target must be an active Life Member to be invitable")
  }

  const expiresAt = new Date(Date.now() + COMMITTEE_INVITE_TTL_DAYS * 86400000)
  const invite = await prisma.committeeInvite.create({
    data: {
      userId: input.targetUserId,
      invitedByUserId: input.superAdminId,
      message: input.message,
      expiresAt,
      status: "pending",
    },
  })

  await sendNotification({
    userId: input.targetUserId,
    kind: "verification_approved",
    title: "You've been invited to join the NNAWCA Committee",
    body: input.message || "Accept within 7 days.",
    entityType: "committee_invite",
    entityId: invite.id,
    sendEmail: false,
  })

  await audit({
    actorId: input.superAdminId,
    action: "committee.invite",
    entityType: "committee_invite",
    entityId: invite.id,
    payload: { targetUserId: input.targetUserId },
  })

  return invite
}

export async function acceptCommitteeInvite(input: { inviteId: string; targetUserId: string }) {
  const invite = await prisma.committeeInvite.findUnique({ where: { id: input.inviteId } })
  if (!invite || invite.userId !== input.targetUserId) throw new ForbiddenError("Invite not found")
  if (invite.status !== "pending") throw new ForbiddenError("Invite is no longer pending")
  if (invite.expiresAt < new Date()) throw new ForbiddenError("Invite expired")

  const endsAt = new Date()
  endsAt.setFullYear(endsAt.getFullYear() + COMMITTEE_DEFAULT_TENURE_YEARS)

  await prisma.committeeInvite.update({
    where: { id: invite.id },
    data: { status: "accepted", respondedAt: new Date() },
  })

  return activateMembership({
    userId: invite.userId,
    planCode: "committee",
    source: "admin_grant",
    amountPaise: 0,
    grantedByUserId: invite.invitedByUserId,
    startsAt: new Date(),
  })
    .then(async (result) => {
      await prisma.membership.updateMany({
        where: { id: result.membershipId },
        data: { endsAt },
      })
      await prisma.user.update({
        where: { id: invite.userId },
        data: { membershipExpiresAt: endsAt },
      })
      return result
    })
}

export async function declineCommitteeInvite(input: { inviteId: string; targetUserId: string }) {
  const invite = await prisma.committeeInvite.findUnique({ where: { id: input.inviteId } })
  if (!invite || invite.userId !== input.targetUserId) throw new ForbiddenError("Invite not found")
  if (invite.status !== "pending") throw new ForbiddenError("Invite is no longer pending")

  await prisma.committeeInvite.update({
    where: { id: invite.id },
    data: { status: "declined", respondedAt: new Date() },
  })
  await prisma.membershipEvent.create({
    data: { userId: invite.userId, type: "committee_declined", actorUserId: invite.invitedByUserId },
  })
}

export interface MembershipStats {
  totalActive: number
  byPlan: Record<string, number>
  mrrInr: number
  lifetimeContributionInr: number
  expiringIn30Days: number
}

export async function getMembershipStats(): Promise<MembershipStats> {
  const rows = await prisma.membership.groupBy({
    by: ["planCode"],
    where: { status: "active" },
    _count: { _all: true },
    _sum: { amountPaise: true },
  })

  const byPlan: Record<string, number> = {}
  let mrrPaise = 0
  let totalActive = 0
  for (const r of rows) {
    byPlan[r.planCode] = r._count._all
    totalActive += r._count._all
    if (r.planCode === "associate" || r.planCode === "premium") {
      mrrPaise += (r._count._all * PLANS[r.planCode as PlanCode].pricePaise) / 12
    }
  }

  const lifetime = await prisma.membership.aggregate({
    where: { status: { in: ["active", "expired", "superseded"] } },
    _sum: { amountPaise: true },
  })

  const horizon = new Date(Date.now() + 30 * 86400000)
  const expiringIn30Days = await prisma.membership.count({
    where: { status: "active", endsAt: { gte: new Date(), lt: horizon } },
  })

  return {
    totalActive,
    byPlan,
    mrrInr: Math.round(mrrPaise / 100),
    lifetimeContributionInr: Math.round((lifetime._sum.amountPaise ?? 0) / 100),
    expiringIn30Days,
  }
}
