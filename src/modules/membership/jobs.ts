import type { PgBoss } from "pg-boss"
import { prisma } from "@/lib/prisma"
import { QUEUE } from "@/lib/jobs"
import { MEMBERSHIP_GRACE_DAYS, COMMITTEE_INVITE_TTL_DAYS } from "@/config/membership"
import { expireMembership } from "@/modules/membership/activation"
import { sendNotification } from "@/modules/notifications/service"
import { audit } from "@/lib/audit"

const DAY_MS = 86400000
const HOUR_MS = 3600000

export async function registerMembershipJobs(boss: PgBoss): Promise<void> {
  await boss.work(QUEUE.MEMBERSHIP_EXPIRE, expireHandler)
  await boss.work(QUEUE.MEMBERSHIP_REMINDER, reminderHandler)
  await boss.work(QUEUE.COMMITTEE_EXPIRY_WARNING, committeeExpiryWarningHandler)
  await boss.work(QUEUE.COMMITTEE_INVITE_EXPIRY, inviteExpiryHandler)
  await boss.work(QUEUE.RAZORPAY_RECONCILE, razorpayReconcileHandler)
  await boss.work(QUEUE.UPSELL_NUDGE, upsellNudgeHandler)

  await boss.schedule(QUEUE.MEMBERSHIP_EXPIRE, "0 * * * *")
  await boss.schedule(QUEUE.MEMBERSHIP_REMINDER, "0 3 * * *")
  await boss.schedule(QUEUE.COMMITTEE_EXPIRY_WARNING, "0 3 * * *")
  await boss.schedule(QUEUE.COMMITTEE_INVITE_EXPIRY, "0 * * * *")
  await boss.schedule(QUEUE.RAZORPAY_RECONCILE, "0 */4 * * *")
  await boss.schedule(QUEUE.UPSELL_NUDGE, "0 4 1 * *")
}

async function expireHandler() {
  const cutoff = new Date(Date.now() - MEMBERSHIP_GRACE_DAYS * DAY_MS)
  const expired = await prisma.membership.findMany({
    where: {
      status: "active",
      endsAt: { lt: cutoff, not: null },
    },
    select: { id: true, userId: true, planCode: true },
  })

  for (const m of expired) {
    try {
      await expireMembership(m.id)
    } catch (e) {
      console.error(`expireMembership failed for ${m.id}`, e)
    }
  }

  await audit({
    action: "job.membership.expire",
    payload: { processed: expired.length },
  })
}

async function reminderHandler() {
  const now = Date.now()
  const windows = [
    { days: 30, type: "reminder_t_minus_30" },
    { days: 14, type: "reminder_t_minus_14" },
    { days: 7, type: "reminder_t_minus_7" },
    { days: 1, type: "reminder_t_minus_1" },
  ]

  for (const w of windows) {
    const start = new Date(now + w.days * DAY_MS - 12 * HOUR_MS)
    const end = new Date(now + w.days * DAY_MS + 12 * HOUR_MS)
    const rows = await prisma.membership.findMany({
      where: {
        status: "active",
        planCode: { in: ["associate", "premium"] },
        endsAt: { gte: start, lt: end },
      },
      select: { id: true, userId: true, planCode: true, endsAt: true },
    })

    for (const r of rows) {
      const alreadySent = await prisma.membershipEvent.findFirst({
        where: {
          userId: r.userId,
          type: w.type,
          createdAt: { gt: new Date(now - 7 * DAY_MS) },
        },
      })
      if (alreadySent) continue

      await sendNotification({
        userId: r.userId,
        kind: "verification_approved",
        title: `Your ${r.planCode} membership expires in ${w.days} days`,
        body: "Renew now to keep your benefits active.",
        sendEmail: false,
      })

      await prisma.membershipEvent.create({
        data: { userId: r.userId, type: w.type, prevPlan: r.planCode },
      })
    }
  }
}

async function committeeExpiryWarningHandler() {
  const now = Date.now()
  const windows = [60, 30, 7]

  for (const days of windows) {
    const start = new Date(now + days * DAY_MS - 12 * HOUR_MS)
    const end = new Date(now + days * DAY_MS + 12 * HOUR_MS)
    const rows = await prisma.membership.findMany({
      where: { status: "active", planCode: "committee", endsAt: { gte: start, lt: end } },
      select: { userId: true, endsAt: true },
    })

    for (const r of rows) {
      const type = `committee_warn_t_minus_${days}`
      const already = await prisma.membershipEvent.findFirst({
        where: { userId: r.userId, type, createdAt: { gt: new Date(now - 7 * DAY_MS) } },
      })
      if (already) continue

      await prisma.membershipEvent.create({
        data: { userId: r.userId, type, prevPlan: "committee" },
      })
    }
  }
}

async function inviteExpiryHandler() {
  const expired = await prisma.committeeInvite.findMany({
    where: { status: "pending", expiresAt: { lt: new Date() } },
    select: { id: true, userId: true },
  })

  for (const inv of expired) {
    await prisma.committeeInvite.update({
      where: { id: inv.id },
      data: { status: "expired" },
    })
    await prisma.membershipEvent.create({
      data: { userId: inv.userId, type: "committee_invite_expired" },
    })
  }

  await audit({
    action: "job.committee.invite_expire",
    payload: { processed: expired.length, ttl_days: COMMITTEE_INVITE_TTL_DAYS },
  })
}

async function razorpayReconcileHandler() {
  await audit({
    action: "job.razorpay.reconcile",
    payload: { note: "stub — wire to Razorpay payments.all when ready" },
  })
}

async function upsellNudgeHandler() {
  const thresholds = [30, 60, 90]
  const now = Date.now()

  for (const days of thresholds) {
    const cohortStart = new Date(now - (days + 1) * DAY_MS)
    const cohortEnd = new Date(now - (days - 1) * DAY_MS)

    const freeUsers = await prisma.user.findMany({
      where: {
        membershipStatus: "free",
        status: "active",
        createdAt: { gte: cohortStart, lt: cohortEnd },
        deletedAt: null,
      },
      select: { id: true },
      take: 500,
    })

    for (const u of freeUsers) {
      const type = `upsell_d_${days}`
      const already = await prisma.membershipEvent.findFirst({
        where: { userId: u.id, type, createdAt: { gt: new Date(now - 60 * DAY_MS) } },
      })
      if (already) continue
      await prisma.membershipEvent.create({ data: { userId: u.id, type } })
    }
  }
}
