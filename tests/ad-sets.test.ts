import { describe, it, expect } from "vitest"
import {
  AD_SETS,
  adIndex,
  showSidebarAd,
  ROTATION_MS,
  type AdSetKey,
} from "@/config/ad-sets"

const KEYS = Object.keys(AD_SETS) as AdSetKey[]

describe("AD_SETS", () => {
  it("every set has creatives, a destination and intrinsic dimensions", () => {
    for (const key of KEYS) {
      const set = AD_SETS[key]
      expect(set.creatives.length, key).toBeGreaterThan(0)
      expect(set.href, key).toMatch(/^https:\/\//)
      expect(set.width, key).toBeGreaterThan(0)
      expect(set.height, key).toBeGreaterThan(0)
    }
  })

  it("every creative has an absolute src and non-empty alt text", () => {
    for (const key of KEYS) {
      for (const ad of AD_SETS[key].creatives) {
        expect(ad.src, `${key}:${ad.src}`).toMatch(/^https:\/\/.+\.png$/)
        expect(ad.alt.trim(), `${key}:${ad.src}`).not.toBe("")
      }
    }
  })

  it("never reuses the same creative across two sets", () => {
    const all = KEYS.flatMap((k) => AD_SETS[k].creatives.map((c) => c.src))
    expect(new Set(all).size).toBe(all.length)
  })

  it("sends each audit set to its own landing page", () => {
    const hrefs = (["seoAi", "website", "content"] as const).map((k) => AD_SETS[k].href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("gives each audit set the five colourways", () => {
    for (const key of ["seoAi", "website", "content"] as const) {
      const srcs = AD_SETS[key].creatives.map((c) => c.src)
      expect(srcs).toHaveLength(5)
      for (const color of ["blue", "green", "orange", "pink", "yellow"]) {
        expect(srcs.some((s) => s.includes(`/${color}-`)), `${key}/${color}`).toBe(true)
      }
    }
  })
})

describe("adIndex", () => {
  it("stays in range for every set at arbitrary times", () => {
    for (const key of KEYS) {
      const len = AD_SETS[key].creatives.length
      for (const now of [0, 1, ROTATION_MS - 1, ROTATION_MS * 37, Date.now()]) {
        const i = adIndex(key, now)
        expect(i, `${key}@${now}`).toBeGreaterThanOrEqual(0)
        expect(i, `${key}@${now}`).toBeLessThan(len)
      }
    }
  })

  it("is stable within an hour and advances on the hour boundary", () => {
    const base = ROTATION_MS * 100
    expect(adIndex("seoAi", base)).toBe(adIndex("seoAi", base + ROTATION_MS - 1))
    expect(adIndex("seoAi", base + ROTATION_MS)).not.toBe(adIndex("seoAi", base))
  })

  it("cycles through every creative over one full rotation", () => {
    const base = ROTATION_MS * 100
    const len = AD_SETS.seoAi.creatives.length
    const seen = new Set(
      Array.from({ length: len }, (_, h) => adIndex("seoAi", base + h * ROTATION_MS)),
    )
    expect(seen.size).toBe(len)
  })

  it("offsets sets so two rails in the same hour differ", () => {
    const now = ROTATION_MS * 100
    const picks = (["seoAi", "website", "content"] as const).map((k) => adIndex(k, now))
    expect(new Set(picks).size).toBe(picks.length)
  })

  it("never returns a negative index for a pre-epoch timestamp", () => {
    // Math.floor of a negative quotient stays negative, so the offset must not
    // push the modulo below zero for any set.
    for (const key of KEYS) {
      expect(adIndex(key, -1), key).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("showSidebarAd", () => {
  it("hides the rail for the ad-free paid tiers", () => {
    expect(showSidebarAd("premium")).toBe(false)
    expect(showSidebarAd("committee")).toBe(false)
  })

  it("shows the rail for free, student, associate — and life", () => {
    // Life is deliberately included: only in-feed ads are switched off for them.
    for (const tier of ["free", "student", "associate", "life"]) {
      expect(showSidebarAd(tier), tier).toBe(true)
    }
  })

  it("shows the rail for logged-out / unknown viewers", () => {
    expect(showSidebarAd(null)).toBe(true)
    expect(showSidebarAd(undefined)).toBe(true)
    expect(showSidebarAd("")).toBe(true)
    expect(showSidebarAd("some-future-tier")).toBe(true)
  })
})
