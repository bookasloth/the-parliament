import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { drainEmailOutbox } from "@/modules/email/service"
import { sendProfileViewDigests } from "@/modules/profile/view-digest"
import { sendDailyDigests } from "@/modules/engagement/daily-digest"
import { sendOnboardingNudges } from "@/modules/engagement/onboarding-nudge"

// Vercel Cron hits this to flush the email outbox — mail that deliver() deferred
// during quiet hours (22:00–07:00 IST) and any future enqueue-for-later sends.
// Scheduled outside quiet hours (see vercel.json); drainEmailOutbox() no-ops if
// it somehow runs inside them.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await drainEmailOutbox()

  // Weekly re-engagement send, folded into this daily cron (Vercel Hobby caps
  // sub-daily crons, so we gate by weekday instead of adding a weekly cron):
  // Mondays in IST → "N people viewed your profile this week".
  const istDay = new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCDay()
  let profileViews: { sent: number; candidates: number } | null = null
  if (istDay === 1) {
    profileViews = await sendProfileViewDigests()
  }

  // Daily "what you missed" digest — the floor of the cadence. Runs every day;
  // only reaches users with a personal signal (unread messages / new followers).
  const digest = await sendDailyDigests()

  // Nudge users who verified but never finished onboarding (~2-day-old cohort).
  const onboarding = await sendOnboardingNudges()

  return NextResponse.json({ ok: true, results, profileViews, digest, onboarding })
}
