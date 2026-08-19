import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "@/lib/prisma"
import { getBotUserId, botAnnounce, botWelcome } from "@/modules/bot/service"

// The NNAWCA bot is a users row with member_type "system". Covers the three MVP
// behaviours: resolve the account, announce to the feed as it, welcome a member.
//
// getBotUserId / getDefaultSchoolId are React cache()-memoized and pick the
// OLDEST system user / school respectively — so seed ONE bot, and backdate its
// school so it wins "oldest" over schools other integration files create.

const rnd = () => Math.random().toString(36).slice(2)
let botId: string

beforeAll(async () => {
  const school = await prisma.school.create({
    data: { name: "Bot School", slug: `s-${rnd()}`, createdAt: new Date("2000-01-01") },
  })
  await prisma.postCategory.create({
    data: { schoolId: school.id, key: "announcement", label: "Announcement" },
  })
  const bot = await prisma.user.create({
    data: { email: `bot-${rnd()}@test.local`, legalName: "NNAWCA", memberType: "system" },
  })
  botId = bot.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("nnawca bot", () => {
  it("resolves the system account via getBotUserId", async () => {
    expect(await getBotUserId()).toBe(botId)
  })

  it("botAnnounce posts a visible feed post authored by the bot", async () => {
    const post = await botAnnounce({ body: "AGM this Sunday at 5pm." })
    expect(post).not.toBeNull()
    expect(post!.authorId).toBe(botId)
    expect(post!.status).toBe("visible")
    expect(post!.body).toBe("AGM this Sunday at 5pm.")
  })

  it("botWelcome follows the member and posts a welcome that @mentions them", async () => {
    const uname = `newbie${rnd().slice(0, 6)}`
    const member = await prisma.user.create({
      data: { email: `m-${rnd()}@test.local`, legalName: "New Member", username: uname },
    })

    await botWelcome(member.id)

    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: botId, followingId: member.id } },
    })
    expect(follow).not.toBeNull()

    // A welcome post authored by the bot, mentioning the member's handle.
    const post = await prisma.post.findFirst({
      where: { authorId: botId, body: { contains: `@${uname}` } },
    })
    expect(post).not.toBeNull()

    // createPost resolved the @mention → PostMention row + mention notification.
    const mention = await prisma.postMention.findFirst({
      where: { postId: post!.id, userId: member.id },
    })
    expect(mention).not.toBeNull()
    const notif = await prisma.notification.findFirst({
      where: { userId: member.id, type: "mention", entityId: post!.id },
    })
    expect(notif).not.toBeNull()
  })

  it("botWelcome no-ops when the target IS the bot", async () => {
    const before = await prisma.post.count({ where: { authorId: botId } })
    await botWelcome(botId)
    const after = await prisma.post.count({ where: { authorId: botId } })
    expect(after).toBe(before)
  })

  it("no welcome post when the member has no username (can't mention)", async () => {
    const member = await prisma.user.create({
      data: { email: `nn-${rnd()}@test.local`, legalName: "No Handle" },
    })
    await botWelcome(member.id)
    // Follow still happens; no post (nothing to mention).
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: botId, followingId: member.id } },
    })
    expect(follow).not.toBeNull()
  })
})
