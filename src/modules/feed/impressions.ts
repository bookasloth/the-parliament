// Pure helpers for feed seen-tracking (Phase 1: never-repeat feed).
// DB-free so they can be unit-tested and reused on both client and server.

/** Max post ids accepted in a single impression flush (bounds the write batch). */
export const IMPRESSION_BATCH_LIMIT = 40

/** How many of the viewer's most-recent impressions to consider when excluding
 *  seen posts. Bounds the `notIn` set so the feed query stays cheap even for
 *  members who've seen thousands of posts. */
export const SEEN_EXCLUSION_WINDOW = 1000

/** Dedupe, drop empties, and cap a set of post ids for one impression flush. */
export function prepareImpressionBatch(
  ids: Iterable<string>,
  limit = IMPRESSION_BATCH_LIMIT,
): string[] {
  const out = new Set<string>()
  for (const id of ids) {
    if (typeof id === "string" && id.length > 0) out.add(id)
    if (out.size >= limit) break
  }
  return [...out]
}

/** Post ids that are genuinely new impressions: candidates the viewer hasn't
 *  already been recorded as seeing. Used to increment viewCount exactly once per
 *  (viewer, post) — re-impressions of already-seen posts don't inflate the count.
 *  Pure — unit tested. */
export function newImpressionIds(candidateIds: string[], seenIds: Iterable<string>): string[] {
  const seen = new Set(seenIds)
  const out = new Set<string>()
  for (const id of candidateIds) {
    if (!seen.has(id)) out.add(id)
  }
  return [...out]
}

/** Union of hidden + seen ids (deduped) — the posts to exclude from the feed. */
export function planExclusions(hiddenIds: string[], seenIds: string[]): string[] {
  const set = new Set<string>(hiddenIds)
  for (const id of seenIds) set.add(id)
  return [...set]
}

/** True when page 1 came back UNDER-FULL because the viewer has already seen most
 *  or all fresh posts — top the page up from the full (seen-inclusive) set rather
 *  than show a near-empty feed. Fires whenever fewer than a full page of unseen
 *  posts remain (not only at exactly zero), which is what left heavy readers with
 *  just 1–2 posts. Requires a seen history so a genuinely small/new feed isn't
 *  mislabelled "caught up". Fallback is first-page only — deeper pages legitimately
 *  reach the end. */
export function shouldServeCaughtUp(opts: {
  page: number
  unseenRowCount: number
  seenCount: number
  pageSize: number
}): boolean {
  return opts.page === 1 && opts.unseenRowCount < opts.pageSize && opts.seenCount > 0
}
