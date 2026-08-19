import { prisma } from "@/lib/prisma"
import { botAnnounce, botDM } from "@/modules/bot/service"
import { POLL_TEMPLATES } from "@/modules/bot/templates"

const APP_BASE = process.env.AUTH_URL || "https://nnawca.org"
const DAY_MS = 86_400_000

// Which bot jobs run on a given day. PURE + UTC (Vercel cron fires in UTC) so it
// is trivially testable. Weekly jobs pin to a weekday; the rest run daily and
// no-op internally when there's nothing to say.
export interface BotCronPlan {
  weeklyPoll: boolean
  weeklyRoundup: boolean
  birthdays: boolean
  eventTomorrow: boolean
  gamesResults: boolean
}

export function planBotCron(now: Date): BotCronPlan {
  const day = now.getUTCDay() // 0 = Sunday
  return {
    weeklyPoll: day === 0, // Sunday
    weeklyRoundup: day === 1, // Monday
    birthdays: true,
    eventTomorrow: true,
    gamesResults: true,
  }
}

// ── Jobs ────────────────────────────────────────────────────────────────────

/** Sunday: post a rotating community poll (one per ISO-ish week). */
export async function postWeeklyPoll(now: Date): Promise<boolean> {
  const week = Math.floor(now.getTime() / (7 * DAY_MS))
  const poll = POLL_TEMPLATES[week % POLL_TEMPLATES.length]
  const post = await botAnnounce({ body: poll.question, poll })
  return !!post
}

/** Monday: post the top 3 posts of the past 7 days by ranking score. */
export async function postWeeklyRoundup(now: Date): Promise<boolean> {
  const bot = await prisma.user.findFirst({ where: { memberType: "system" }, select: { id: true } })
  const top = await prisma.post.findMany({
    where: {
      deletedAt: null,
      status: "visible",
      isAnonymous: false,
      createdAt: { gt: new Date(now.getTime() - 7 * DAY_MS) },
      authorId: bot ? { not: bot.id } : undefined,
    },
    orderBy: { rankingScore: "desc" },
    take: 3,
    select: { id: true, body: true, author: { select: { username: true } } },
  })
  if (top.length === 0) return false
  const lines = top.map((p, i) => {
    const snippet = (p.body ?? "").replace(/\s+/g, " ").trim().slice(0, 80)
    return `${i + 1}. ${snippet || "(post)"} → ${APP_BASE}/feed/${p.id}`
  })
  const body = `📊 Top posts this week on NNAWCA:\n\n${lines.join("\n")}\n\nCatch up and join the conversation! 💙`
  return !!(await botAnnounce({ body }))
}

/** Daily: private DM birthday greetings. DOB is owner-only (privacy policy), so
 *  this NEVER posts publicly — greetings are 1:1 DMs only. */
export async function dmBirthdays(now: Date): Promise<number> {
  const m = now.getUTCMonth() + 1
  const d = now.getUTCDate()
  const rows = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, COALESCE(NULLIF(display_name, ''), legal_name) AS name
    FROM users
    WHERE date_of_birth IS NOT NULL
      AND EXTRACT(MONTH FROM date_of_birth) = ${m}
      AND EXTRACT(DAY FROM date_of_birth) = ${d}
      AND status = 'active'
      AND onboarding_completed = true
      AND member_type <> 'system'
      AND deleted_at IS NULL
    LIMIT 100`
  let sent = 0
  for (const u of rows) {
    const body = `🎉 Happy birthday, ${u.name}! Wishing you a wonderful year ahead from all of us at NNAWCA. 🎂`
    await botDM(u.id, body).then(() => { sent++ }).catch(() => {})
  }
  return sent
}

/** Daily: public feed reminder for any event starting tomorrow (UTC calendar
 *  day). The RSVP DM fan-out is handled separately by the event-invites cron —
 *  this is the community-facing heads-up. */
export async function postEventTomorrow(now: Date): Promise<number> {
  const startTomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const startDayAfter = new Date(startTomorrow.getTime() + DAY_MS)
  const events = await prisma.event.findMany({
    where: { status: "published", startsAt: { gte: startTomorrow, lt: startDayAfter } },
    take: 5,
    select: { title: true, venue: true, mode: true, startsAt: true },
  })
  let posted = 0
  for (const e of events) {
    const time = e.startsAt.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
    const where = e.venue ? ` at ${e.venue}` : e.mode === "online" ? " (online)" : ""
    const body = `📅 Tomorrow: ${e.title} — ${time} IST${where}. See you there! #NNAWCA #events`
    if (await botAnnounce({ body, categoryKey: "event" }).then((p) => !!p).catch(() => false)) posted++
  }
  return posted
}

/** Daily: post individual game winners frozen in the last ~26h (weekly/monthly/
 *  yearly periods; daily champions are too noisy). Runs after alfazy-champions. */
export async function postGamesResults(now: Date): Promise<boolean> {
  const champs = await prisma.gameChampion.findMany({
    where: {
      scope: "individual",
      period: { in: ["weekly", "monthly", "yearly"] },
      decidedAt: { gt: new Date(now.getTime() - 26 * 3_600_000) },
    },
    orderBy: { totalScore: "desc" },
    take: 10,
    select: { period: true, winnerLabel: true, totalScore: true, game: { select: { title: true } } },
  })
  if (champs.length === 0) return false
  const lines = champs.map((c) => `🏆 ${c.game.title} (${c.period}): ${c.winnerLabel} — ${c.totalScore} pts`)
  const body = `🎮 NNAWCA game results are in!\n\n${lines.join("\n")}\n\nCongratulations, champions! Think you can top the leaderboard? 🕹️ #NNAWCA #games`
  return !!(await botAnnounce({ body }))
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export interface BotCronSummary {
  plan: BotCronPlan
  weeklyPoll?: boolean
  weeklyRoundup?: boolean
  birthdaysDM?: number
  eventTomorrow?: number
  gamesResults?: boolean
}

/** Run every enabled bot job for `now`. Each is best-effort — one failing job
 *  never blocks the others. Returns a summary for the cron response. */
export async function runBotDaily(now: Date): Promise<BotCronSummary> {
  const plan = planBotCron(now)
  const summary: BotCronSummary = { plan }
  const safe = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try { return await fn() } catch (e) { console.error("bot cron job failed:", e); return undefined }
  }

  if (plan.weeklyPoll) summary.weeklyPoll = await safe(() => postWeeklyPoll(now))
  if (plan.weeklyRoundup) summary.weeklyRoundup = await safe(() => postWeeklyRoundup(now))
  if (plan.birthdays) summary.birthdaysDM = await safe(() => dmBirthdays(now))
  if (plan.eventTomorrow) summary.eventTomorrow = await safe(() => postEventTomorrow(now))
  if (plan.gamesResults) summary.gamesResults = await safe(() => postGamesResults(now))

  return summary
}
