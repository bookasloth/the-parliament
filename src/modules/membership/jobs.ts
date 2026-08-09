import type { PgBoss } from "pg-boss"
import { prisma } from "@/lib/prisma"
import { QUEUE } from "@/lib/jobs"
import { MEMBERSHIP_GRACE_DAYS, COMMITTEE_INVITE_TTL_DAYS, PLANS, type PlanCode } from "@/config/membership"
import { expireMembership } from "@/modules/membership/activation"
import { sendNotification } from "@/modules/notifications/service"
import { sendEmail } from "@/lib/email"
import { processDueInviteWaves } from "@/modules/events/invites"
import { audit } from "@/lib/audit"

const DAY_MS = 86400000
const HOUR_MS = 3600000

/**
 * Run every scheduled membership maintenance task once, in sequence, isolating
 * failures so one broken task can't abort the rest. This is the Vercel-Cron entry
 * point (pg-boss can't run on Vercel serverless — nothing stays alive to poll).
 * Every handler is idempotent (guards on already-emitted MembershipEvents), so a
 * daily run — or a retry — is safe. Returns a per-task status for the cron log.
 */
export async function runMembershipMaintenance(): Promise<Record<string, string>> {
  const tasks: [string, () => Promise<void>][] = [
    ["expire", expireHandler],
    ["reminder", reminderHandler],
    ["committeeExpiryWarning", committeeExpiryWarningHandler],
    ["inviteExpiry", inviteExpiryHandler],
    ["razorpayReconcile", razorpayReconcileHandler],
    ["upsellNudge", upsellNudgeHandler],
    ["birthday", birthdayHandler],
    // Fallback so due event-invite waves still go out if the dedicated hourly
    // cron isn't running (e.g. Vercel Hobby, which caps crons at daily).
    ["eventInviteWaves", async () => { await processDueInviteWaves() }],
  ]
  const results: Record<string, string> = {}
  for (const [name, fn] of tasks) {
    try {
      await fn()
      results[name] = "ok"
    } catch (e) {
      results[name] = `error: ${(e as Error).message}`
      console.error(`[cron:membership] ${name} failed`, e)
    }
  }
  return results
}

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

  const base = process.env.AUTH_URL || "https://nnawca.org"
  for (const m of expired) {
    try {
      await expireMembership(m.id)
      // Committee reverts to Life (still active) — no "expired" notice there.
      if (m.planCode !== "committee") {
        const u = await prisma.user.findUnique({
          where: { id: m.userId },
          select: { email: true, legalName: true },
        })
        if (u?.email) {
          await sendEmail(
            "membership_expired",
            u.email,
            { firstName: u.legalName?.split(" ")[0] || "there", renewUrl: `${base}/membership` },
            m.userId,
          )
        }
      }
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

      // Email every window in the ladder (was: 7-day only). Code template →
      // typed + tested, no DB-seed dependency.
      if (r.endsAt) {
        try {
          const u = await prisma.user.findUnique({
            where: { id: r.userId },
            select: { email: true, legalName: true },
          })
          if (u?.email) {
            const base = process.env.AUTH_URL || "https://nnawca.org"
            await sendEmail(
              "membership_expiring",
              u.email,
              {
                firstName: u.legalName?.split(" ")[0] || "there",
                planName: PLANS[r.planCode as PlanCode]?.displayName ?? r.planCode,
                daysLeft: String(w.days),
                expiresOn: r.endsAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                renewUrl: `${base}/membership`,
              },
              r.userId,
            )
          }
        } catch (e) {
          console.error(`membership_expiring email failed for ${r.userId}`, e)
        }
      }

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
  const base = process.env.AUTH_URL || "https://nnawca.org"

  for (const days of thresholds) {
    const cohortStart = new Date(now - (days + 1) * DAY_MS)
    const cohortEnd = new Date(now - (days - 1) * DAY_MS)

    // Free (student) members → nudge to unlock a paid plan.
    const freeUsers = await prisma.user.findMany({
      where: { membershipStatus: "student", status: "active", createdAt: { gte: cohortStart, lt: cohortEnd }, deletedAt: null },
      select: { id: true, email: true, legalName: true },
      take: 500,
    })
    for (const u of freeUsers) {
      if (await alreadyNudged(u.id, `upsell_d_${days}`, now)) continue
      await prisma.membershipEvent.create({ data: { userId: u.id, type: `upsell_d_${days}` } })
      if (u.email) {
        await sendEmail(
          "upsell_unlock",
          u.email,
          { firstName: u.legalName?.split(" ")[0] || "there", membershipUrl: `${base}/membership` },
          u.id,
        ).catch((e) => console.error(`upsell_unlock email failed for ${u.id}`, e))
      }
    }

    // Associate members → nudge to upgrade to Premium.
    const associates = await prisma.user.findMany({
      where: { membershipStatus: "associate", status: "active", createdAt: { gte: cohortStart, lt: cohortEnd }, deletedAt: null },
      select: { id: true, email: true, legalName: true },
      take: 500,
    })
    for (const u of associates) {
      if (await alreadyNudged(u.id, `upgrade_d_${days}`, now)) continue
      await prisma.membershipEvent.create({ data: { userId: u.id, type: `upgrade_d_${days}` } })
      if (u.email) {
        await sendEmail(
          "upsell_upgrade",
          u.email,
          { firstName: u.legalName?.split(" ")[0] || "there", planName: PLANS.premium.displayName, upgradeUrl: `${base}/membership` },
          u.id,
        ).catch((e) => console.error(`upsell_upgrade email failed for ${u.id}`, e))
      }
    }
  }
}

async function alreadyNudged(userId: string, type: string, now: number): Promise<boolean> {
  const row = await prisma.membershipEvent.findFirst({
    where: { userId, type, createdAt: { gt: new Date(now - 60 * DAY_MS) } },
  })
  return Boolean(row)
}

/**
 * Wish active members a happy birthday. Matches month+day in IST (the cron runs
 * daily); the send is category "wish" so it respects opt-out + quiet hours (it
 * defers to the outbox overnight and goes out that morning).
 */
async function birthdayHandler() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const month = ist.getUTCMonth() + 1
  const day = ist.getUTCDate()
  const base = process.env.AUTH_URL || "https://nnawca.org"

  const rows = await prisma.$queryRaw<
    { id: string; email: string; legal_name: string; username: string | null }[]
  >`SELECT id, email, legal_name, username FROM users
    WHERE status = 'active' AND deleted_at IS NULL AND date_of_birth IS NOT NULL
      AND EXTRACT(MONTH FROM date_of_birth) = ${month}
      AND EXTRACT(DAY FROM date_of_birth) = ${day}
    LIMIT 1000`

  for (const u of rows) {
    if (!u.email) continue
    await sendEmail(
      "birthday_wish",
      u.email,
      {
        firstName: u.legal_name?.split(" ")[0] || "there",
        profileUrl: u.username ? `${base}/${u.username}` : `${base}/feed`,
      },
      u.id,
    ).catch((e) => console.error(`birthday email failed for ${u.id}`, e))
  }
}
