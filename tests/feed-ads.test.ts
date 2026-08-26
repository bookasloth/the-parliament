import { describe, it, expect } from "vitest"
import type { FeedPost } from "@/components/shared/FeedCard"
import {
  injectFeedAds,
  weaveFeedAds,
  adStateAfter,
  adGapFor,
  AD_GAP,
  AD_GAP_ASSOCIATE,
  FEED_ADS,
} from "@/config/feed-ads"

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

  it("premium, life, and committee never see feed ads (paid ad-free)", () => {
    for (const t of ["premium", "life", "committee"]) {
      expect(injectFeedAds(posts(20), t, [ad("x")]).some(isAd)).toBe(false)
    }
  })

  it("places an ad after every 5 posts at the base cadence (inactive/unknown)", () => {
    const out = injectFeedAds(posts(20), "inactive", [ad("x")])
    // p0..p4, ad, p5..p9, ad, ...
    expect(out[5]).toMatchObject({ isSponsored: true })
    expect(out.slice(0, 5).some(isAd)).toBe(false)
    expect(out[11]).toMatchObject({ isSponsored: true })
    expect(out.slice(6, 11).some(isAd)).toBe(false)
  })

  it("associate gets the REDUCED cadence — one ad every 10 posts", () => {
    const out = injectFeedAds(posts(20), "associate", [ad("x")])
    expect(out[10]).toMatchObject({ isSponsored: true })
    expect(out.slice(0, 10).some(isAd)).toBe(false)
    // 20 posts at gap 10 → 2 ads, vs 4 at the base gap.
    expect(out.filter(isAd)).toHaveLength(2)
  })

  it("ads repeat and cycle through the rotation (not once)", () => {
    const three = [ad("a"), ad("b"), ad("c")]
    const out = injectFeedAds(posts(30), "inactive", three)
    const adIds = out.filter(isAd).map((p) => p.id)
    // 30 posts, gap 5 → 6 ads, cycling a,b,c,a,b,c.
    expect(adIds).toEqual(["a", "b", "c", "a", "b", "c"])
  })

  it("student: capped 5-item feed with ads at positions 2 & 5", () => {
    const out = injectFeedAds(posts(20), "student", [ad("x"), ad("y")])
    expect(out).toHaveLength(5)
    expect(out.map(isAd)).toEqual([false, true, false, false, true])
  })

  it("shows the rotation even when the feed is too short to space them", () => {
    const three = [ad("a"), ad("b"), ad("c")]
    // only 2 posts (< gap) — all 3 ads still appear (appended).
    const out = injectFeedAds(posts(2), "inactive", three)
    expect(out.filter(isAd).map((p) => p.id)).toEqual(["a", "b", "c"])
  })

  it("does not mutate the original array", () => {
    const ps = posts(2)
    injectFeedAds(ps, "inactive", [ad("x")])
    expect(ps).toHaveLength(2)
  })
})

describe("adGapFor — the paid ad ladder", () => {
  it("premium/life/committee are ad-free (null gap)", () => {
    expect(adGapFor("premium")).toBeNull()
    expect(adGapFor("life")).toBeNull()
    expect(adGapFor("committee")).toBeNull()
  })
  it("associate gets a wider (reduced) gap than the base tier", () => {
    expect(adGapFor("associate")).toBe(AD_GAP_ASSOCIATE)
    expect(AD_GAP_ASSOCIATE).toBeGreaterThan(AD_GAP)
  })
  it("student and unknown tiers fall back to the base gap", () => {
    expect(adGapFor("student")).toBe(AD_GAP)
    expect(adGapFor("inactive")).toBe(AD_GAP)
    expect(adGapFor("free")).toBe(AD_GAP)
  })
})

describe("weaveFeedAds continuation (load-more)", () => {
  const three = [ad("a"), ad("b"), ad("c")]

  it("resumes the cadence + rotation across pages without a gap", () => {
    // Page 1: 7 posts → ad after p4 (a); phase carries 2 posts into page 2.
    const p1 = weaveFeedAds(posts(7), { sinceAd: 0, adIdx: 0 }, three)
    expect(p1.posts.filter(isAd).map((p) => p.id)).toEqual(["a"])
    expect(p1.state).toEqual({ sinceAd: 2, adIdx: 1 })

    // Page 2 (7 more posts) continues: 3 more posts hit the gap → ad (b); the
    // remaining 4 don't reach the next gap. Phase carries 4 into page 3.
    const p2 = weaveFeedAds(posts(7), p1.state, three)
    expect(p2.posts.filter(isAd).map((p) => p.id)).toEqual(["b"])
    expect(p2.state).toEqual({ sinceAd: 4, adIdx: 2 })
    // Combined cadence: an ad after every 5th real post across the page boundary.
    const combined = [...p1.posts, ...p2.posts]
    const realIdxOfAds = combined.reduce<number[]>((acc, p, i) => {
      if (p.isSponsored) acc.push(combined.slice(0, i).filter((q) => !q.isSponsored).length)
      return acc
    }, [])
    expect(realIdxOfAds).toEqual([5, 10]) // 14 real posts → ads after #5 and #10
  })

  it("weaving a page then resuming == weaving the whole run at once", () => {
    // Compare the ad placement (sponsored flag + which ad) — post ids restart per
    // posts() call, so only the ad pattern is comparable across the split.
    const pattern = (list: FeedPost[]) => list.map((p) => (p.isSponsored ? p.id : "."))
    const whole = weaveFeedAds(posts(23), { sinceAd: 0, adIdx: 0 }, three)
    const a = weaveFeedAds(posts(10), { sinceAd: 0, adIdx: 0 }, three)
    const b = weaveFeedAds(posts(13), a.state, three)
    expect(pattern([...a.posts, ...b.posts])).toEqual(pattern(whole.posts))
    expect(b.state).toEqual(whole.state)
  })

  it("adStateAfter matches the state produced by weaving that many posts", () => {
    for (const n of [0, 1, 4, 5, 6, 12, 25]) {
      const w = weaveFeedAds(posts(n), { sinceAd: 0, adIdx: 0 }, three)
      expect(adStateAfter(n)).toEqual(w.state)
    }
  })

  it("no ads when the rotation is empty", () => {
    const r = weaveFeedAds(posts(5), { sinceAd: 0, adIdx: 0 }, [])
    expect(r.posts.some(isAd)).toBe(false)
  })
})

describe("FEED_ADS pool", () => {
  it("AD_GAP is 5", () => {
    expect(AD_GAP).toBe(5)
  })
  it("ships the AiSensy ad with its referral backlink", () => {
    const aisensy = FEED_ADS.find((a) => a.id === "ad-aisensy")
    expect(aisensy?.sponsorUrl).toBe("https://wa.aisensy.com/ref/ad4mls")
    expect(aisensy?.isSponsored).toBe(true)
  })
  it("every ad has a unique id, a CTA url, and a sponsored flag", () => {
    const ids = FEED_ADS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of FEED_ADS) {
      expect(a.isSponsored).toBe(true)
      expect(a.sponsorUrl).toBeTruthy()
    }
  })
})
