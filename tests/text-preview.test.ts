import { describe, it, expect } from "vitest"
import { truncateForPreview, PREVIEW_LIMIT } from "@/lib/text-preview"

describe("truncateForPreview", () => {
  it("leaves short text untouched", () => {
    const r = truncateForPreview("hello world")
    expect(r).toEqual({ shown: "hello world", truncated: false })
  })

  it("does not truncate text exactly at the limit", () => {
    const text = "a".repeat(PREVIEW_LIMIT)
    const r = truncateForPreview(text)
    expect(r.truncated).toBe(false)
    expect(r.shown).toBe(text)
  })

  it("truncates text one char over the limit", () => {
    const text = "a".repeat(PREVIEW_LIMIT + 1)
    const r = truncateForPreview(text)
    expect(r.truncated).toBe(true)
    expect(r.shown.endsWith("…")).toBe(true)
    // Hard-cut (no nearby space): limit chars + ellipsis.
    expect(r.shown.length).toBe(PREVIEW_LIMIT + 1)
  })

  it("breaks on a word boundary when a space is near the limit", () => {
    const words = ("lorem ".repeat(60)).trim() // spaces every 6 chars, well past limit
    const r = truncateForPreview(words)
    expect(r.truncated).toBe(true)
    // Should not cut mid-word: char before the ellipsis is a letter, and there's
    // no trailing partial "lore"/"lor" fragment.
    expect(r.shown.endsWith("…")).toBe(true)
    expect(r.shown).not.toMatch(/\slor?e?…$/)
  })

  it("respects a custom limit", () => {
    const r = truncateForPreview("abcdefghij", 5)
    expect(r.truncated).toBe(true)
    expect(r.shown.length).toBeLessThanOrEqual(6) // 5 + ellipsis
  })

  it("hard-cuts when the only space is far from the limit", () => {
    // One early space, then a long unbroken run — no space near the limit.
    const text = "a " + "b".repeat(PREVIEW_LIMIT)
    const r = truncateForPreview(text)
    expect(r.truncated).toBe(true)
    // Falls back to the hard limit rather than the far-away space at index 1.
    expect(r.shown.length).toBe(PREVIEW_LIMIT + 1)
  })
})
