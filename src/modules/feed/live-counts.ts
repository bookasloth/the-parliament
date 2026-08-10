// Pure merge for the feed's live count refresh (DB-free, unit-tested).
// Server returns fresh engagement counters for visible posts; we fold them into
// the client's post list WITHOUT touching anything else on the post object
// (viewerReaction, savedByViewer, author, etc.) so the acting user's optimistic
// vote/save state is never clobbered.

interface Counts {
  id: string
  upvoteCount: number
  downvoteCount: number
  commentCount: number
  shareCount: number
}

// Minimal shape the merge reads/writes; the real FeedPost is a superset.
interface CountFields {
  id: string
  upvotes: number
  downvotes: number
  comments: number
  shares: number
}

/**
 * Return a new list where posts present in `fresh` have their four counters
 * updated. Object identity is preserved for posts whose counts are unchanged
 * (so memoized rows don't needlessly re-render); only actually-changed posts get
 * a new object. Posts not in `fresh` are returned untouched.
 */
export function mergePostCounts<T extends CountFields>(posts: T[], fresh: Counts[]): T[] {
  if (fresh.length === 0) return posts
  const byId = new Map(fresh.map((c) => [c.id, c]))
  let changed = false
  const next = posts.map((p) => {
    const c = byId.get(p.id)
    if (!c) return p
    if (
      p.upvotes === c.upvoteCount &&
      p.downvotes === c.downvoteCount &&
      p.comments === c.commentCount &&
      p.shares === c.shareCount
    ) {
      return p
    }
    changed = true
    return {
      ...p,
      upvotes: c.upvoteCount,
      downvotes: c.downvoteCount,
      comments: c.commentCount,
      shares: c.shareCount,
    }
  })
  return changed ? next : posts
}
