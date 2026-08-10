// Pure comment-thread flattening. Comments store their TRUE parentId (a reply to
// a reply points at that reply), but the UI renders only one visual level. This
// walks each reply up to its top-level ancestor for bucketing, and — without
// deep threading — surfaces the DIRECT parent's author as "replying to @handle"
// whenever that parent is itself a reply (not the top-level comment). DB-free so
// it unit-tests without Prisma.

export interface ThreadNode {
  id: string
  parentId: string | null
}

export interface OrganizedThread<T extends ThreadNode> {
  /** Top-level comments (parentId === null), in input order. */
  roots: T[]
  /** rootId → its replies (flattened, input order), each with the resolved target. */
  repliesByRoot: Map<string, { comment: T; replyingTo: string | null }[]>
}

/**
 * Group `comments` into one visual level per top-level ancestor.
 * `handleOf(c)` yields the @handle to show; only set when the direct parent is a
 * reply. Replies whose ancestor chain doesn't resolve to a fetched root are
 * dropped (ancestor beyond the page) rather than orphaned to the wrong place.
 */
export function organizeCommentThread<T extends ThreadNode>(
  comments: T[],
  handleOf: (c: T) => string | null,
): OrganizedThread<T> {
  const byId = new Map(comments.map((c) => [c.id, c]))
  const roots = comments.filter((c) => c.parentId == null)
  const repliesByRoot = new Map<string, { comment: T; replyingTo: string | null }[]>()
  for (const r of roots) repliesByRoot.set(r.id, [])

  for (const c of comments) {
    if (c.parentId == null) continue
    // Walk to the top-level ancestor (guard against cycles / broken chains).
    let cur: T | undefined = c
    let guard = 0
    while (cur && cur.parentId != null && guard++ < 10_000) {
      cur = byId.get(cur.parentId)
    }
    if (!cur || cur.parentId != null) continue // ancestor not in page → drop
    const bucket = repliesByRoot.get(cur.id)
    if (!bucket) continue
    const directParent = byId.get(c.parentId)
    // Only reply-to-a-reply carries a "replying to" target; reply-to-top does not.
    const replyingTo =
      directParent && directParent.parentId != null ? handleOf(directParent) : null
    bucket.push({ comment: c, replyingTo })
  }

  return { roots, repliesByRoot }
}
