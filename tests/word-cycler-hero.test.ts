import { describe, expect, it } from "vitest"
import { WORDS, LEAD, GLUE, SEPS, nextIndex, CYCLE_MS } from "@/components/homepage/WordCyclerHero"

describe("WordCyclerHero cycle logic", () => {
  it("advances and wraps around", () => {
    expect(nextIndex(0, WORDS.length)).toBe(1)
    expect(nextIndex(WORDS.length - 1, WORDS.length)).toBe(0) // wrap
  })

  it("full loop returns to start", () => {
    let i = 0
    for (let n = 0; n < WORDS.length; n++) i = nextIndex(i, WORDS.length)
    expect(i).toBe(0)
  })

  it("has unique keys and a 2s cadence", () => {
    expect(new Set(WORDS.map((w) => w.key)).size).toBe(WORDS.length)
    expect(CYCLE_MS).toBe(2000)
  })

  it("glue + seps weave the words into one readable sentence", () => {
    expect(GLUE.length).toBe(WORDS.length)
    expect(SEPS.length).toBe(WORDS.length)
    const sentence =
      LEAD + WORDS.reduce((acc, w, i) => acc + w.label + GLUE[i] + SEPS[i], "")
    expect(sentence).toBe(
      "We are here to reconnect, mentor, grow and give back together.",
    )
  })

  it("commas are glued to their word, not left as break points", () => {
    // Only spaces (breakable) live in SEPS; commas live in GLUE.
    expect(GLUE.every((g) => !g.includes(" "))).toBe(true)
  })

  it("every word carries an accent hex, label, image and caption", () => {
    for (const w of WORDS) {
      expect(w.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(w.label.length).toBeGreaterThan(0)
      expect(w.img).toMatch(/^https:\/\//)
      expect(w.caption.length).toBeGreaterThan(0)
    }
  })
})
