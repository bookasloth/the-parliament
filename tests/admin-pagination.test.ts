import { describe, it, expect } from "vitest"
import { parsePage, pageCount, firstParam, PAGE_SIZE } from "@/modules/admin/pagination"

describe("parsePage", () => {
  it("defaults to page 1 for missing/garbage input", () => {
    for (const raw of [undefined, "", "abc", "0", "-3", "1.5"]) {
      const p = parsePage(raw)
      expect(p.page).toBeGreaterThanOrEqual(1)
      expect(p.skip).toBe((p.page - 1) * PAGE_SIZE)
    }
    expect(parsePage(undefined).page).toBe(1)
    expect(parsePage("0").page).toBe(1)
    expect(parsePage("-3").page).toBe(1)
  })

  it("computes skip/take for a valid page", () => {
    const p = parsePage("3")
    expect(p.page).toBe(3)
    expect(p.skip).toBe(2 * PAGE_SIZE)
    expect(p.take).toBe(PAGE_SIZE)
  })

  it("takes the first value of an array param", () => {
    expect(parsePage(["4", "9"]).page).toBe(4)
  })
})

describe("pageCount", () => {
  it("is at least 1 even for zero rows", () => {
    expect(pageCount(0)).toBe(1)
  })
  it("rounds up partial pages", () => {
    expect(pageCount(PAGE_SIZE)).toBe(1)
    expect(pageCount(PAGE_SIZE + 1)).toBe(2)
    expect(pageCount(PAGE_SIZE * 2)).toBe(2)
  })
})

describe("firstParam", () => {
  it("trims to non-empty or undefined", () => {
    expect(firstParam("  hi ")).toBe("hi")
    expect(firstParam("   ")).toBeUndefined()
    expect(firstParam(undefined)).toBeUndefined()
    expect(firstParam(["a", "b"])).toBe("a")
  })
})
