import { describe, it, expect } from "vitest"
import { compactNum } from "@/components/shared/ProfileSidebarView"

describe("compactNum", () => {
  it("passes small numbers through unchanged", () => {
    expect(compactNum(0)).toBe("0")
    expect(compactNum(1)).toBe("1")
    expect(compactNum(999)).toBe("999")
  })

  it("formats thousands with a K suffix", () => {
    expect(compactNum(1000)).toBe("1K")
    expect(compactNum(2500)).toBe("2.5K")
    expect(compactNum(15000)).toBe("15K")
  })

  it("drops the decimal only when the thousands are whole", () => {
    expect(compactNum(1000)).toBe("1K") // whole → no decimal
    expect(compactNum(1200)).toBe("1.2K") // fractional → one decimal
  })
})
