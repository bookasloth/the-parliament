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

/** Union of hidden + seen ids (deduped) — the posts to exclude from the feed. */
export function planExclusions(hiddenIds: string[], seenIds: string[]): string[] {
  const set = new Set<string>(hiddenIds)
  for (const id of seenIds) set.add(id)
  return [...set]
}

/** True when the viewer has seen everything on the first page and we should fall
 *  back to the full (seen-inclusive) set rather than show an empty feed. Fallback
 *  is first-page only — deeper pages legitimately reach the end. */
export function shouldServeCaughtUp(opts: {
  page: number
  unseenRowCount: number
  seenCount: number
}): boolean {
  return opts.page === 1 && opts.unseenRowCount === 0 && opts.seenCount > 0
}
