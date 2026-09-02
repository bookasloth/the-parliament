import { describe, it, expect } from "vitest"
import { isSearchScope, totalResults, SEARCH_SCOPES, type SearchResults } from "@/modules/search/service"

describe("search helpers", () => {
  it("validates scope strings", () => {
    for (const s of SEARCH_SCOPES) expect(isSearchScope(s)).toBe(true)
    expect(isSearchScope("bogus")).toBe(false)
    expect(isSearchScope(null)).toBe(false)
    expect(isSearchScope(undefined)).toBe(false)
  })

  it("counts results across every type", () => {
    const r: SearchResults = {
      query: "x", scope: "all",
      people: [{ id: "1", username: null, name: "A", headline: null, photoUrl: null, href: "/1" }],
      posts: [{ id: "p", snippet: "s", authorName: "A", createdAt: new Date(), href: "/feed/p" }],
      groups: [], events: [], businesses: [],
      hashtags: [{ tag: "t", useCount: 3, href: "/feed?tag=t" }],
    }
    expect(totalResults(r)).toBe(3)
  })

  it("is zero for an all-empty result", () => {
    const r: SearchResults = { query: "", scope: "all", people: [], posts: [], groups: [], events: [], businesses: [], hashtags: [] }
    expect(totalResults(r)).toBe(0)
  })
})
