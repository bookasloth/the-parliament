import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { resolveMonthlyEggs, resetAllEggs } from "@/modules/economy/eggs"
import { sendNotification } from "@/modules/notifications/service"

// Monthly egg resolve: flag top holders, reset all to 20.
// Run on the 1st of each month via GitHub Actions (Vercel Hobby can't do monthly).
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { topHolders } = await resolveMonthlyEggs()

  // Notify the "winners" (losers)
  for (const holder of topHolders) {
    await sendNotification({
      userId: holder.id,
      kind: "egg_volunteer",
      title: "🥚 You got egged!",
      body: `You ended the month with ${holder.eggBalance} eggs — the most on the platform. Time to volunteer for an event!`,
    })
  }

  const resetCount = await resetAllEggs()

  return NextResponse.json({
    topHolders: topHolders.map((h) => h.id),
    eggCount: topHolders[0]?.eggBalance ?? 0,
    resetUsers: resetCount,
  })
}
