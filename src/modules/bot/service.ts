import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { followUser } from "@/modules/connections/service"
import { createPost, type CreatePostInput, type PostFormat } from "@/modules/feed/posts"
import { WELCOME_TEMPLATES, pickTemplate } from "@/modules/bot/templates"

/**
 * The official NNAWCA system account ("the bot"). It is a normal User row whose
 * memberType is "system" — every content function takes a userId string and does
 * no human-check, so the bot just passes its own id. Seeded out-of-band (see
 * prisma/seeds/nnawca-bot.sql); this module resolves it at runtime, so the code
 * ships before the row exists and no-ops until it does.
 */
export const BOT_USERNAME = "nnawca"

/** Resolve the bot's user id, or null if the account hasn't been seeded yet. */
export const getBotUserId = cache(async (): Promise<string | null> => {
  const bot = await prisma.user.findFirst({
    where: { memberType: "system", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, profile: { select: { photoUrl: true } } },
  })
  return bot?.id ?? null
})

/**
 * Welcome a freshly-onboarded member: the bot follows them (unlocks a future DM
 * edge + fires the "started following you" notification) and posts a public
 * welcome to the feed that @mentions them by handle — createPost resolves the
 * mention, so the member gets a real mention notification and the post links
 * back to their profile. Best-effort: never throws, never blocks the caller.
 * No-ops if the bot isn't seeded, the target IS the bot, or (for the mention
 * post) the member has no username yet.
 */
export async function botWelcome(userId: string): Promise<void> {
  try {
    const botId = await getBotUserId()
    if (!botId || botId === userId) return

    await followUser(botId, userId).catch(() => {})

    const member = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    })
    if (!member?.username) return // no handle → can't mention; skip the post

    const body = pickTemplate(WELCOME_TEMPLATES, userId).replace("{mention}", `@${member.username}`)
    await botAnnounce({ body }).catch(() => {})
  } catch (e) {
    console.error("botWelcome failed:", e)
  }
}

export interface BotAnnounceInput {
  body: string
  format?: PostFormat
  categoryKey?: string
  media?: CreatePostInput["media"]
  linkUrl?: string
  groupId?: string
}

/**
 * Post an announcement to the feed as the official NNAWCA account. Returns the
 * created post, or null if the bot account or a school isn't set up. Callable
 * from an admin route or a cron job (in-process — no session needed).
 */
export async function botAnnounce(input: BotAnnounceInput) {
  const botId = await getBotUserId()
  if (!botId) return null
  const schoolId = await getDefaultSchoolId()
  if (!schoolId) return null

  // Prefer the "announcement" category; fall back to any category the school has
  // so a not-yet-seeded category can't 500 a broadcast.
  const wanted = input.categoryKey ?? "announcement"
  const exists = await prisma.postCategory.findUnique({
    where: { schoolId_key: { schoolId, key: wanted } },
    select: { key: true },
  })
  const categoryKey =
    exists?.key ??
    (await prisma.postCategory.findFirst({ where: { schoolId }, select: { key: true } }))?.key
  if (!categoryKey) return null

  return createPost({
    authorId: botId,
    schoolId,
    categoryKey,
    format: input.format ?? "text",
    body: input.body,
    media: input.media,
    linkUrl: input.linkUrl,
    groupId: input.groupId,
  })
}
