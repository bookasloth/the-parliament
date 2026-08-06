import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

/**
 * Weekly "N people viewed your profile" re-engagement email — the classic
 * LinkedIn return hook. One email per user who had at least one distinct viewer
 * in the last 7 days. deliver() still applies the user's prefs, suppression and
 * the daily frequency cap, so this can't spam.
 */
export async function sendProfileViewDigests(): Promise<{ sent: number; candidates: number }> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  // One row per (profile, viewer), so a per-profile row count == distinct viewers.
  const grouped = await prisma.profileView.groupBy({
    by: ["profileUserId"],
    where: { lastViewedAt: { gte: since } },
    _count: { viewerId: true },
  })

  const base = process.env.AUTH_URL || "https://nnawca.org"
  let sent = 0
  for (const g of grouped) {
    const count = g._count.viewerId
    if (count < 1) continue
    const user = await prisma.user.findUnique({
      where: { id: g.profileUserId },
      select: { email: true, username: true },
    })
    if (!user?.email) continue
    const profileUrl = `${base}/${user.username ?? ""}`
    await sendEmail("profile_views", user.email, { count: String(count), profileUrl }, g.profileUserId)
    sent++
  }
  return { sent, candidates: grouped.length }
}
