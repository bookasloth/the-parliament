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

  it("committee never sees feed ads", () => {
    expect(injectFeedAds(posts(20), "committee", [ad("x")]).some(isAd)).toBe(false)
  })

  // rand()=0 → gap = 5 (min); rand()→~1 → gap = 10 (max).
  const gap5 = () => 0

  it("gap is random within 5–10", () => {
    // Single post per call can't show a gap; probe gap() bounds indirectly:
    // rand=0 places the first ad after exactly 5 posts.
    const min = injectFeedAds(posts(20), "associate", [ad("x")], () => 0)
    expect(isAd(min[5])).toBe(true)
    expect(min.slice(0, 5).some(isAd)).toBe(false)
    // rand=0.999 → gap 10: first ad after exactly 10 posts.
    const max = injectFeedAds(posts(20), "associate", [ad("x")], () => 0.999)
    expect(isAd(max[10])).toBe(true)
    expect(max.slice(0, 10).some(isAd)).toBe(false)
  })

  it("ads repeat and cycle through the rotation (not once)", () => {
    const three = [ad("a"), ad("b"), ad("c")]
    const out = injectFeedAds(posts(30), "associate", three, gap5)
    const adIds = out.filter(isAd).map((p) => p.id)
    // 30 posts, gap 5 → ~6 ads, cycling a,b,c,a,b,c.
    expect(adIds.length).toBeGreaterThanOrEqual(5)
    expect(adIds.slice(0, 6)).toEqual(["a", "b", "c", "a", "b", "c"])
  })

  it("student: capped 5-item feed with ads at positions 2 & 5", () => {
    const out = injectFeedAds(posts(20), "student", [ad("x"), ad("y")])
    expect(out).toHaveLength(5)
    expect(out.map(isAd)).toEqual([false, true, false, false, true])
  })

  it("shows the rotation even when the feed is too short to space them (all 3 visible)", () => {
    const three = [ad("a"), ad("b"), ad("c")]
    // gap is ≥5 but only 2 posts here — all 3 ads still appear (appended).
    const out = injectFeedAds(posts(2), "associate", three, gap5)
    const adIds = out.filter(isAd).map((p) => p.id)
    expect(adIds).toEqual(["a", "b", "c"])
  })

  it("student also surfaces the full ad rotation", () => {
    const out = injectFeedAds(posts(3), "student", [ad("a"), ad("b"), ad("c")])
    expect(out.filter(isAd).map((p) => p.id)).toEqual(["a", "b", "c"])
  })

  it("does not mutate the original array", () => {
    const ps = posts(2)
    injectFeedAds(ps, "associate", [ad("x")])
    expect(ps).toHaveLength(2)
  })
})
