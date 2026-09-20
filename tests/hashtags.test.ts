import { describe, it, expect } from "vitest"
import { extractHashtags, diffHashtags } from "@/modules/feed/hashtags"

describe("extractHashtags", () => {
  it("extracts simple hashtags", () => {
    expect(extractHashtags("Hello #world")).toEqual(["world"])
  })

  it("extracts multiple unique hashtags", () => {
    expect(extractHashtags("#hello #world #test")).toEqual(["hello", "world", "test"])
  })

  it("deduplicates case-insensitively", () => {
    expect(extractHashtags("#Hello #hello #HELLO")).toEqual(["hello"])
  })

  it("returns empty for null/undefined/empty", () => {
    expect(extractHashtags(null)).toEqual([])
    expect(extractHashtags(undefined)).toEqual([])
    expect(extractHashtags("")).toEqual([])
  })

  it("ignores hash in URLs and emails", () => {
    expect(extractHashtags("visit https://example.com#section")).toEqual([])
  })

  it("requires letter after hash", () => {
    expect(extractHashtags("#123 #_nope")).toEqual([])
  })

  it("caps at max", () => {
    const body = Array.from({ length: 20 }, (_, i) => `#tag${i}`).join(" ")
    expect(extractHashtags(body, 5)).toHaveLength(5)
  })

  it("handles hashtag at start of line", () => {
    expect(extractHashtags("#first line\n#second line")).toEqual(["first", "second"])
  })

  it("ignores mid-word hash", () => {
    expect(extractHashtags("foo#bar")).toEqual([])
  })
})

describe("diffHashtags (useCount drift fix, audit §5 #6)", () => {
  it("first save: all tags added, none removed", () => {
    expect(diffHashtags([], ["a", "b"])).toEqual({ added: ["a", "b"], removed: [] })
  })

  it("re-save of identical tags: no increment, no decrement (was the drift bug)", () => {
    expect(diffHashtags(["a", "b"], ["a", "b"])).toEqual({ added: [], removed: [] })
  })

  it("edit swaps a tag: one added, one removed", () => {
    expect(diffHashtags(["a", "b"], ["a", "c"])).toEqual({ added: ["c"], removed: ["b"] })
  })

  it("delete (empty next): all removed, none added", () => {
    expect(diffHashtags(["a", "b"], [])).toEqual({ added: [], removed: ["a", "b"] })
  })

  it("accepts a Map's keys iterator as prev", () => {
    const prev = new Map([["a", "id1"], ["b", "id2"]])
    expect(diffHashtags(prev.keys(), ["b", "c"])).toEqual({ added: ["c"], removed: ["a"] })
  })
})
