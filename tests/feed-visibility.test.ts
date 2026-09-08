import { describe, it, expect } from "vitest"
import { visibleAuthorWhere, followersAudienceWhere, isRepostOriginalHidden } from "@/modules/feed/visibility"

// Pure audience-rule builders (audit CP0-1 profile-timeline leak + CP0-2
// suspended/banned content suppression). No DB — callers pass the follow set.

describe("visibleAuthorWhere", () => {
  it("hides suspended and banned authors, keeps active/inactive", () => {
    const w = visibleAuthorWhere()
    expect(w).toEqual({ status: { notIn: ["suspended", "banned"] } })
    const hidden = (w.status as { notIn: string[] }).notIn
    expect(hidden).toContain("suspended")
    expect(hidden).toContain("banned")
    expect(hidden).not.toContain("active")
    expect(hidden).not.toContain("inactive")
  })
})

describe("followersAudienceWhere", () => {
  it("own timeline: no restriction (author sees all their own posts)", () => {
    const w = followersAudienceWhere({ viewerId: "me", followingIds: [], viewingOwnTimeline: true })
    expect(w).toBeNull()
  })

  it("logged-out viewer: public-scope only (followers-only posts hidden)", () => {
    const w = followersAudienceWhere({ viewerId: undefined, followingIds: [], viewingOwnTimeline: false })
    expect(w).toEqual({ visibilityScope: { not: "followers" } })
  })

  it("logged-out on a public profile cannot see a followers-only post", () => {
    // Regression guard for the CP0-1 leak: the profile branch used to skip this,
    // rendering followers-only posts to logged-out visitors.
    const w = followersAudienceWhere({ viewerId: undefined, followingIds: [], viewingOwnTimeline: false })
    expect((w as { visibilityScope: { not: string } }).visibilityScope.not).toBe("followers")
  })

  it("logged-in non-follower: public OR own posts only (target excluded)", () => {
    const w = followersAudienceWhere({ viewerId: "me", followingIds: [], viewingOwnTimeline: false })
    expect(w).toEqual({
      OR: [{ visibilityScope: { not: "followers" } }, { authorId: { in: ["me"] } }],
    })
    const ids = (w!.OR as [unknown, { authorId: { in: string[] } }])[1].authorId.in
    expect(ids).not.toContain("alice") // a non-followed author's followers-only post stays hidden
  })

  it("logged-in follower: followed authors' followers-only posts become visible", () => {
    const w = followersAudienceWhere({
      viewerId: "me",
      followingIds: ["alice", "bob"],
      viewingOwnTimeline: false,
    })
    const ids = (w!.OR as [unknown, { authorId: { in: string[] } }])[1].authorId.in
    expect(ids).toEqual(expect.arrayContaining(["alice", "bob", "me"]))
  })

  it("follow set is passed through from any iterable (Set)", () => {
    const w = followersAudienceWhere({
      viewerId: "me",
      followingIds: new Set(["x"]),
      viewingOwnTimeline: false,
    })
    const ids = (w!.OR as [unknown, { authorId: { in: string[] } }])[1].authorId.in
    expect(ids).toEqual(["x", "me"])
  })
})

describe("isRepostOriginalHidden", () => {
  const visible = {
    deletedAt: null as Date | null,
    status: "visible",
    visibilityScope: "network",
    authorId: "author",
    author: { status: "active" },
  }
  const viewer = { viewerId: "v", followingIds: new Set<string>(), blockedIds: new Set<string>() }

  it("shows a public, live original by an active author", () => {
    expect(isRepostOriginalHidden(visible, viewer)).toBe(false)
  })
  it("hides a deleted or removed original", () => {
    expect(isRepostOriginalHidden({ ...visible, deletedAt: new Date() }, viewer)).toBe(true)
    expect(isRepostOriginalHidden({ ...visible, status: "removed" }, viewer)).toBe(true)
  })
  it("hides an original whose author is suspended or banned", () => {
    expect(isRepostOriginalHidden({ ...visible, author: { status: "suspended" } }, viewer)).toBe(true)
    expect(isRepostOriginalHidden({ ...visible, author: { status: "banned" } }, viewer)).toBe(true)
  })
  it("hides across a block relationship", () => {
    expect(isRepostOriginalHidden(visible, { ...viewer, blockedIds: new Set(["author"]) })).toBe(true)
  })
  it("hides a followers-only original from a non-follower, shows it to a follower/author", () => {
    const fo = { ...visible, visibilityScope: "followers" }
    expect(isRepostOriginalHidden(fo, viewer)).toBe(true) // non-follower
    expect(isRepostOriginalHidden(fo, { ...viewer, followingIds: new Set(["author"]) })).toBe(false)
    expect(isRepostOriginalHidden(fo, { viewerId: "author", followingIds: new Set(), blockedIds: new Set() })).toBe(false)
  })
  it("logged-out viewer can't see a followers-only original", () => {
    expect(isRepostOriginalHidden({ ...visible, visibilityScope: "followers" }, { followingIds: new Set(), blockedIds: new Set() })).toBe(true)
  })
})
