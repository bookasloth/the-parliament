// Pure helper for the feed "new posts" poll (audit P-1 / P-7: the 30s poll ran a
// COUNT on the school per client — a thundering herd). The recent-posts list is
// cached school-wide (viewer-independent); each viewer's pill count is derived
// from it in memory here. Framework-free → unit-tested in isolation.

export interface RecentPost {
  createdAt: string // ISO
  authorId: string
}

export interface PostCounts {
  id: string
  upvoteCount: number
  downvoteCount: number
  commentCount: number
  shareCount: number
}

/**
 * Split a batch of ids against a parallel array of cache values (Redis mget order)
 * into cache hits and the ids that missed and must be fetched from the DB.
 * Framework-free → unit-tested; the DB fetch + write-back lives in the action.
 */
export function splitCacheHits(
  ids: string[],
  cachedVals: (PostCounts | null | undefined)[],
): { hits: PostCounts[]; missIds: string[] } {
  const hits: PostCounts[] = []
  const missIds: string[] = []
  ids.forEach((id, i) => {
    const v = cachedVals[i]
    if (v) hits.push(v)
    else missIds.push(id)
  })
  return { hits, missIds }
}

/**
 * How many of the cached recent posts are newer than `sinceIso`, excluding the
 * viewer's own (don't nag someone about their just-posted content). Bounded by
 * the cached list length — a "60+" burst simply reports the cap, which is all the
 * pill needs. Returns 0 on an unparseable `sinceIso`.
 */
export function countNewSince(recent: RecentPost[], sinceIso: string, viewerId?: string): number {
  const since = new Date(sinceIso).getTime()
  if (Number.isNaN(since)) return 0
  let n = 0
  for (const p of recent) {
    if (new Date(p.createdAt).getTime() > since && p.authorId !== viewerId) n++
  }
  return n
}
