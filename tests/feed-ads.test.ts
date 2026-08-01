import { describe, it, expect } from "vitest"
import type { FeedPost } from "@/components/shared/FeedCard"
import { injectFeedAds } from "@/config/feed-ads"

const post = (id: string): FeedPost => ({
  id,
  name: id,
  headline: "",
  membership: "associate",
  timestamp: "now",
  upvotes: 0,
  downvotes: 0,
  comments: 0,
  shares: 0,
  avatar: "",
  borderType: "blue",
})
const ad = (id: string): FeedPost => ({ ...post(id), isSponsored: true })

describe("injectFeedAds", () => {
  it("returns the input untouched when there are no ads", () => {
    const posts = [post("a"), post("b")]
    expect(injectFeedAds(posts, [])).toBe(posts)
  })

  it("returns the input untouched when there are no posts", () => {
    const ads = [ad("x")]
    expect(injectFeedAds([], ads)).toEqual([])
  })

  it("inserts an ad after every N posts", () => {
    const posts = Array.from({ length: 12 }, (_, i) => post(`p${i}`))
    const out = injectFeedAds(posts, [ad("x"), ad("y")], 5)
    // ad after index 4 and after index 9 (accounting for the first insert)
    expect(out[5].id).toBe("x")
    expect(out[11].id).toBe("y")
    expect(out.filter((p) => p.isSponsored)).toHaveLength(2)
  })

  it("stops once ads run out", () => {
    const posts = Array.from({ length: 20 }, (_, i) => post(`p${i}`))
    const out = injectFeedAds(posts, [ad("x")], 5)
    expect(out.filter((p) => p.isSponsored)).toHaveLength(1)
  })

  it("still shows one ad when the page is shorter than everyN", () => {
    const out = injectFeedAds([post("a"), post("b")], [ad("x")], 5)
    expect(out).toHaveLength(3)
    expect(out[2].id).toBe("x")
  })

  it("does not mutate the original array", () => {
    const posts = [post("a"), post("b")]
    injectFeedAds(posts, [ad("x")], 1)
    expect(posts).toHaveLength(2)
  })
})
