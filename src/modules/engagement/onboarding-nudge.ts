import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Nudge users who verified their email but abandoned the onboarding wizard.
 * Targets the cohort that signed up ~2 days ago (single daily-cron window) and
 * still has `onboardingCompleted = false`. Idempotent: a `membership_events` row
 * of type "onboarding_nudge" marks a user as nudged, so a retry / second tick
 * won't re-send. deliver() still applies opt-out + suppression on top.
 */
export async function sendOnboardingNudges(now: Date = new Date()): Promise<{ sent: number; candidates: number }> {
  const cohortStart = new Date(now.getTime() - 3 * DAY_MS)
  const cohortEnd = new Date(now.getTime() - 1 * DAY_MS)

  const users = await prisma.user.findMany({
    where: {
      onboardingCompleted: false,
      emailVerifiedAt: { not: null },
      status: "active",
      deletedAt: null,
      createdAt: { gte: cohortStart, lt: cohortEnd },
    },
    select: { id: true, email: true, legalName: true, onboardingStep: true },
    take: 500,
  })
  if (users.length === 0) return { sent: 0, candidates: 0 }

  const base = process.env.AUTH_URL || "https://nnawca.org"
  let sent = 0
  for (const u of users) {
    if (!u.email) continue
    const already = await prisma.membershipEvent.findFirst({
      where: { userId: u.id, type: "onboarding_nudge" },
    })
    if (already) continue
    await prisma.membershipEvent.create({ data: { userId: u.id, type: "onboarding_nudge" } })
    await sendEmail(
      "onboarding_incomplete",
      u.email,
      {
        firstName: u.legalName?.split(" ")[0] || "there",
        resumeUrl: `${base}/onboarding/${u.onboardingStep || "profile"}`,
      },
      u.id,
    ).catch((e) => console.error(`onboarding_incomplete email failed for ${u.id}`, e))
    sent++
  }
  return { sent, candidates: users.length }
}
