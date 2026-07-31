import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/modules/notifications/service"

// Usernames are lowercase slugs (see generateUsername). Match @handle tokens in
// post/comment bodies. Deduped, lowercased, capped so a body stuffed with @s
// can't fan out unbounded. The lookbehind skips @ preceded by a word char so
// email addresses (foo@bar.com) don't register as mentions.
const MENTION_RE = /(?<![a-z0-9._-])@([a-z0-9][a-z0-9._-]{1,59})/gi

export function extractMentionHandles(body: string | null | undefined, max = 20): string[] {
  if (!body) return []
  const seen = new Set<string>()
  for (const m of body.matchAll(MENTION_RE)) {
    seen.add(m[1].toLowerCase())
    if (seen.size >= max) break
  }
  return [...seen]
}

/**
 * Resolve @mentions in a freshly-created post/comment body, record PostMention
 * rows, and notify each mentioned user (in-app + email). Best-effort: never
 * throws into the create path. Skips self-mentions.
 */
export async function notifyMentions(input: {
  body: string | null | undefined
  authorId: string
  authorName: string
  postId: string
  url: string
}): Promise<void> {
  try {
    const handles = extractMentionHandles(input.body)
    if (!handles.length) return
    const users = await prisma.user.findMany({
      where: { username: { in: handles }, status: "active" },
      select: { id: true },
    })
    for (const u of users) {
      if (u.id === input.authorId) continue
      await prisma.postMention
        .create({ data: { postId: input.postId, mentionType: "user", userId: u.id } })
        .catch(() => {})
      await sendNotification({
        userId: u.id,
        kind: "mention",
        title: `${input.authorName} mentioned you`,
        entityType: "post",
        entityId: input.postId,
        email: { fromName: input.authorName, postUrl: input.url },
      })
    }
  } catch (e) {
    console.error(`mention notify failed for post ${input.postId}`, e)
  }
}
