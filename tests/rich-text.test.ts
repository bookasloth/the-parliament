import { describe, it, expect } from "vitest"
import { normalizeHashtag, hashtagHref, postHashtagWhere, splitRichText } from "@/lib/rich-text"

describe("normalizeHashtag", () => {
  it("strips leading '#' and lowercases", () => {
    expect(normalizeHashtag("#React")).toBe("react")
    expect(normalizeHashtag("react")).toBe("react")
  })

  it("collapses repeated hashes and trims", () => {
    expect(normalizeHashtag("  ##Alumni")).toBe("alumni")
  })

  it("is case-insensitive so differently-cased tags match", () => {
    expect(normalizeHashtag("#JNV")).toBe(normalizeHashtag("jnv"))
  })
})

describe("hashtagHref", () => {
  it("points at the tag-filtered feed with the normalized tag", () => {
    expect(hashtagHref("#React")).toBe("/feed?tag=react")
    expect(hashtagHref("jnv")).toBe("/feed?tag=jnv")
  })
})

describe("postHashtagWhere", () => {
  it("builds a normalized relation filter for the feed query", () => {
    expect(postHashtagWhere("#React")).toEqual({ some: { hashtag: { tag: "react" } } })
  })
})

describe("splitRichText", () => {
  it("turns a #hashtag into a hashtag token with a normalized tag", () => {
    expect(splitRichText("hot #Alumni news")).toEqual([
      { type: "text", value: "hot " },
      { type: "hashtag", value: "#Alumni", tag: "alumni" },
      { type: "text", value: " news" },
    ])
  })

  it("plain text yields no hashtag/link tokens", () => {
    const toks = splitRichText("just plain words")
    expect(toks).toEqual([{ type: "text", value: "just plain words" }])
    expect(toks.some((t) => t.type !== "text")).toBe(false)
  })

  it("classifies mentions, urls and hashtags in one pass", () => {
    const toks = splitRichText("@ann see https://x.co/a #Fun")
    expect(toks.map((t) => t.type)).toEqual(["mention", "text", "url", "text", "hashtag"])
  })

  it("empty string yields no tokens", () => {
    expect(splitRichText("")).toEqual([])
  })
})
