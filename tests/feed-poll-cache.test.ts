import { describe, it, expect } from "vitest"
import { countNewSince, splitCacheHits, type RecentPost, type PostCounts } from "@/modules/feed/poll-cache"

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

describe("countNewSince", () => {
  const recent: RecentPost[] = [
    { createdAt: iso(1_000), authorId: "a" },   // newest
    { createdAt: iso(5_000), authorId: "me" },
    { createdAt: iso(10_000), authorId: "b" },
    { createdAt: iso(60_000), authorId: "c" },  // oldest
  ]

  it("counts only posts newer than `since`", () => {
    expect(countNewSince(recent, iso(7_000))).toBe(2) // the 1s + 5s posts
    expect(countNewSince(recent, iso(70_000))).toBe(4) // all
    expect(countNewSince(recent, iso(0))).toBe(0) // nothing newer than now
  })

  it("excludes the viewer's own posts", () => {
    // Without the viewer filter, since=7s ago → 2 (a + me). Excluding "me" → 1.
    expect(countNewSince(recent, iso(7_000), "me")).toBe(1)
  })

  it("returns 0 for an unparseable since", () => {
    expect(countNewSince(recent, "not-a-date")).toBe(0)
  })

  it("is naturally capped by the cached list length", () => {
    // The list is the cap: a huge burst can't report more than what's cached.
    expect(countNewSince(recent, iso(999_999))).toBeLessThanOrEqual(recent.length)
  })
})

describe("splitCacheHits", () => {
  const c = (id: string): PostCounts => ({ id, upvoteCount: 1, downvoteCount: 0, commentCount: 0, shareCount: 0 })

  it("separates cache hits from ids that must hit the DB, preserving mget order", () => {
    const { hits, missIds } = splitCacheHits(["a", "b", "c"], [c("a"), null, c("c")])
    expect(hits.map((h) => h.id)).toEqual(["a", "c"])
    expect(missIds).toEqual(["b"])
  })

  it("all-miss when the cache is cold (or Redis errored → all null)", () => {
    const { hits, missIds } = splitCacheHits(["a", "b"], [null, undefined])
    expect(hits).toEqual([])
    expect(missIds).toEqual(["a", "b"])
  })

  it("all-hit when everything is warm", () => {
    const { hits, missIds } = splitCacheHits(["a"], [c("a")])
    expect(hits).toHaveLength(1)
    expect(missIds).toEqual([])
  })
})
