import { prisma } from "@/lib/prisma"
import { deleteObject } from "@/lib/r2"
import { deleteStorageObject, pathFromPublicUrl } from "@/lib/supabase-storage"

// Media garbage collection (audit P1-7). Media used to live forever — a deleted
// post/comment left its R2/Supabase objects orphaned, so storage grew
// monotonically and deleted images stayed fetchable at their public URLs.
//
// We purge lazily, only once the owning content has been soft-deleted for longer
// than the restore window (P0-6 lets a moderator restore removed content), so a
// restore inside that window keeps its images. After purge we null the field so
// the row isn't reprocessed and nothing points at a dead object.

/** Days a soft-deleted row's media is retained before it's eligible for GC. */
export const MEDIA_RETENTION_DAYS = 30

/** Pull deletable R2 object keys out of a Post.media JSON array. Only real R2
 *  post-media keys (`posts/…`) are returned — the "Updated my profile photo"
 *  posts embed a Supabase avatar URL as their media key, which must NOT be
 *  deleted here (it may still be the user's live avatar). Pure. */
export function postMediaKeys(media: unknown): string[] {
  if (!Array.isArray(media)) return []
  const out: string[] = []
  for (const m of media) {
    const key = (m as { key?: unknown } | null)?.key
    if (typeof key === "string" && key.startsWith("posts/")) out.push(key)
  }
  return out
}

/**
 * Delete media for content soft-deleted before the retention cutoff, then null
 * the field. Idempotent and bounded. Runs from `/api/cron/media`.
 */
export async function runMediaGc(now = new Date(), batch = 500): Promise<{
  postsPurged: number
  commentsPurged: number
  objectsDeleted: number
}> {
  const cutoff = new Date(now.getTime() - MEDIA_RETENTION_DAYS * 86_400_000)
  let postsPurged = 0
  let commentsPurged = 0
  let objectsDeleted = 0

  // ── Posts ──
  const posts = await prisma.post.findMany({
    where: { deletedAt: { lt: cutoff }, NOT: { media: { equals: [] } } },
    select: { id: true, media: true },
    take: batch,
  })
  for (const p of posts) {
    const keys = postMediaKeys(p.media)
    for (const key of keys) {
      await deleteObject(key).catch(() => {})
      objectsDeleted++
    }
    // Clear media regardless (drops the avatar-embed entries we skip too — the
    // post is long gone, nothing should reference them).
    await prisma.post.update({ where: { id: p.id }, data: { media: [] } })
    postsPurged++
  }

  // ── Comments ──
  const comments = await prisma.comment.findMany({
    where: { deletedAt: { lt: cutoff }, imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
    take: batch,
  })
  for (const c of comments) {
    const path = pathFromPublicUrl(c.imageUrl)
    if (path) {
      await deleteStorageObject(path).catch(() => {})
      objectsDeleted++
    }
    await prisma.comment.update({ where: { id: c.id }, data: { imageUrl: null } })
    commentsPurged++
  }

  return { postsPurged, commentsPurged, objectsDeleted }
}
