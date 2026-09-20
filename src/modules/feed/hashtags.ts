import { prisma } from "@/lib/prisma"
import { normalizeHashtag } from "@/lib/rich-text"

const HASHTAG_RE = /(?<!\w)#([a-zA-Z]\w{0,49})/g

export function extractHashtags(body: string | null | undefined, max = 10): string[] {
  if (!body) return []
  const tags = new Set<string>()
  for (const m of body.matchAll(HASHTAG_RE)) {
    tags.add(normalizeHashtag(m[1]))
    if (tags.size >= max) break
  }
  return [...tags]
}

/**
 * Reconcile a post's hashtags against `body`, keeping `Hashtag.useCount` honest.
 *
 * The old version deleted all join rows and re-incremented every tag, so an edit
 * (or a re-save) inflated `useCount` forever and a delete never decremented it —
 * trending drifted upward (audit §5 #6). This diffs the current tags against the
 * new set: only added tags increment, only removed tags decrement (floored at 0
 * so double-calls / pre-existing drift can't push a count negative). Pass a null
 * body to clear all tags (used on post delete).
 */
/** Diff previous vs next tag sets. Pure — the count-reconcile decision lives here
 *  so it's unit-testable without a DB. `added` tags increment, `removed` decrement. */
export function diffHashtags(prevTags: Iterable<string>, nextTags: Iterable<string>): {
  added: string[]
  removed: string[]
} {
  const prev = new Set(prevTags)
  const next = new Set(nextTags)
  return {
    added: [...next].filter((t) => !prev.has(t)),
    removed: [...prev].filter((t) => !next.has(t)),
  }
}

export async function syncPostHashtags(postId: string, body: string | null | undefined) {
  const nextTags = extractHashtags(body)
  try {
    const existing = await prisma.postHashtag.findMany({
      where: { postId },
      select: { hashtag: { select: { id: true, tag: true } } },
    })
    const prev = new Map(existing.map((e) => [e.hashtag.tag, e.hashtag.id]))
    const { added, removed } = diffHashtags(prev.keys(), nextTags)

    if (removed.length) {
      const removedIds = removed.map((t) => prev.get(t)!).filter(Boolean)
      // floor at 0: only decrement counts that are still positive
      await prisma.hashtag.updateMany({
        where: { id: { in: removedIds }, useCount: { gt: 0 } },
        data: { useCount: { decrement: 1 } },
      })
      await prisma.postHashtag.deleteMany({
        where: { postId, hashtagId: { in: removedIds } },
      })
    }

    for (const tag of added) {
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
