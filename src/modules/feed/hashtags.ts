import { prisma } from "@/lib/prisma"

const HASHTAG_RE = /(?<!\w)#([a-zA-Z]\w{0,49})/g

export function extractHashtags(body: string | null | undefined, max = 10): string[] {
  if (!body) return []
  const tags = new Set<string>()
  for (const m of body.matchAll(HASHTAG_RE)) {
    tags.add(m[1].toLowerCase())
    if (tags.size >= max) break
  }
  return [...tags]
}

export async function syncPostHashtags(postId: string, body: string | null | undefined) {
  const tags = extractHashtags(body)
  try {
    await prisma.postHashtag.deleteMany({ where: { postId } })
    if (tags.length === 0) return
    for (const tag of tags) {
      const ht = await prisma.hashtag.upsert({
        where: { tag },
        create: { tag, useCount: 1 },
        update: { useCount: { increment: 1 } },
      })
      await prisma.postHashtag.create({ data: { postId, hashtagId: ht.id } })
    }
  } catch (err) {
    console.error("[syncPostHashtags] failed for post", postId, err)
  }
}
