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
const posts = (n: number) => Array.from({ length: n }, (_, i) => post(`p${i}`))
const isAd = (p: FeedPost) => !!p.isSponsored

describe("injectFeedAds tiering", () => {
  it("returns input untouched when there are no ads / no posts", () => {
    const ps = posts(2)
    expect(injectFeedAds(ps, "associate", [])).toBe(ps)
    expect(injectFeedAds([], "associate", [ad("x")])).toEqual([])
  })

  it("life & committee never see feed ads", () => {
    expect(injectFeedAds(posts(20), "life", [ad("x"), ad("y")]).some(isAd)).toBe(false)
    expect(injectFeedAds(posts(20), "committee", [ad("x")]).some(isAd)).toBe(false)
  })

  it("student: capped 5-item feed with ads at positions 2 & 5", () => {
    const out = injectFeedAds(posts(20), "student", [ad("x"), ad("y")])
    expect(out).toHaveLength(5)
    expect(out.map(isAd)).toEqual([false, true, false, false, true])
  })

  it("associate: an ad after every 5 posts", () => {
    const out = injectFeedAds(posts(12), "associate", [ad("x"), ad("y")])
    expect(out[5].id).toBe("x")
    expect(out[11].id).toBe("y")
  })

  it("premium: an ad after every 10 posts, none at 5", () => {
    const out = injectFeedAds(posts(10), "premium", [ad("x")])
    expect(isAd(out[5])).toBe(false)
    expect(isAd(out[10])).toBe(true)
  })

  it("does not mutate the original array", () => {
    const ps = posts(2)
    injectFeedAds(ps, "associate", [ad("x")])
    expect(ps).toHaveLength(2)
  })
})
