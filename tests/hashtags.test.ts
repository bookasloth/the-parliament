import { describe, it, expect } from "vitest"
import { extractHashtags } from "@/modules/feed/hashtags"

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
