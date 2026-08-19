import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { followUser } from "@/modules/connections/service"
import { sendNotification } from "@/modules/notifications/service"
import { createPost, type CreatePostInput, type PostFormat } from "@/modules/feed/posts"

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

async function botPhoto(): Promise<string | undefined> {
  const bot = await prisma.user.findFirst({
    where: { memberType: "system", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { profile: { select: { photoUrl: true } } },
  })
  return bot?.profile?.photoUrl ?? undefined
}

/**
 * Welcome a freshly-onboarded member: the bot follows them (which also unlocks a
 * future DM edge and fires the "started following you" notification) and sends a
 * one-off in-app welcome. Entirely best-effort — never throws, never blocks the
 * caller. No-ops if the bot account isn't seeded or the target IS the bot.
 */
export async function botWelcome(userId: string): Promise<void> {
  try {
    const botId = await getBotUserId()
    if (!botId || botId === userId) return

    await followUser(botId, userId).catch(() => {})

    await sendNotification({
      userId,
      kind: "bot_welcome",
      title: "Welcome to The Parliament 🎉",
      body: "You're in! Complete your profile, find your batchmates in the directory, and say hello in the feed. — Team NNAWCA",
      entityType: "user",
      entityId: botId,
      imageUrl: await botPhoto(),
      sendEmail: false,
    })
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
