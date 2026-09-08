import { describe, it, expect } from "vitest"
import { mapRowToFeedPost } from "@/app/(main)/feed/map-row"
import { ANON_NAMES, ANON_ICONS } from "@/config/anon-identities"

// map-row is safe to import under the node test env — its FeedPost/getFeed/MediaItem
// imports are `import type` (erased); the only runtime dep is the anon-identities
// config. This locks the anonymous-post identity + the de-anonymization leak fix.

// Minimal row matching what mapRowToFeedPost reads (it casts most fields).
const row = (over: Record<string, unknown> = {}) =>
  ({
    id: "post-1",
    createdAt: new Date(),
    body: "hello",
    media: [],
    format: "text",
    upvoteCount: 0,
    downvoteCount: 0,
    commentCount: 0,
    shareCount: 0,
    isPinned: false,
    isEdited: false,
    isAnonymous: false,
    viewerReaction: null,
    savedBy: [],
    repostOf: null,
    repostOfId: null,
    author: {
      id: "author-1",
      username: "realuser",
      legalName: "Real Name",
      displayName: "Real Name",
      isVerified: true,
      membershipStatus: "associate",
      profile: { photoUrl: null, headline: "hi", house: null, batch: null },
    },
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

describe("mapRowToFeedPost — anonymous posts", () => {
  it("non-anon post exposes the real author normally", () => {
    const p = mapRowToFeedPost(row(), undefined, "viewer-x")
    expect(p.authorId).toBe("author-1")
    expect(p.name).toBe("Real Name")
    expect(p.username).toBe("realuser")
    expect(p.anonIcon).toBeUndefined()
  })

  it("anon post to a NON-author: no real identity leaks", () => {
    const p = mapRowToFeedPost(row({ isAnonymous: true }), undefined, "viewer-x")
    expect(p.authorId).toBeUndefined()          // the leak fix — real id withheld
    expect(p.username).toBeUndefined()
    expect(p.isFollowing).toBe(false)
    expect(p.isVerified).toBe(false)
    expect(ANON_NAMES).toContain(p.name)        // codename, not the real name
    expect(ANON_ICONS).toContain(p.anonIcon)    // icon assigned
    expect(p.anonColor).toBeTruthy()
    expect(p.name).not.toBe("Real Name")
  })

  it("anon post to a LOGGED-OUT viewer: still no real id", () => {
    const p = mapRowToFeedPost(row({ isAnonymous: true }), undefined, undefined)
    expect(p.authorId).toBeUndefined()
    expect(ANON_NAMES).toContain(p.name)
  })

  it("anon post to the AUTHOR themselves: id present (so they get their own menu)", () => {
    const p = mapRowToFeedPost(row({ isAnonymous: true }), undefined, "author-1")
    expect(p.authorId).toBe("author-1")
    expect(ANON_NAMES).toContain(p.name)        // still shown anonymized to everyone incl. author
  })
})
