import { describe, it, expect } from "vitest"
import { batchOrdinal, formatBatch } from "@/app/(main)/feed/map-row"

// JNV Nagpur's 1st batch entered 1986 → 1986 is the "1st", 2006 the "21st".
describe("batchOrdinal", () => {
  it("maps entry year to the right ordinal", () => {
    expect(batchOrdinal(1986)).toBe("1st")
    expect(batchOrdinal(1987)).toBe("2nd")
    expect(batchOrdinal(1988)).toBe("3rd")
    expect(batchOrdinal(2006)).toBe("21st") // the case in question
    expect(batchOrdinal(2008)).toBe("23rd")
    expect(batchOrdinal(1996)).toBe("11th") // 11/12/13 → th
    expect(batchOrdinal(1998)).toBe("13th")
  })

  it("returns null for missing or pre-first years", () => {
    expect(batchOrdinal(null)).toBeNull()
    expect(batchOrdinal(undefined)).toBeNull()
    expect(batchOrdinal(1985)).toBeNull()
  })

  it("formatBatch prefixes the ordinal", () => {
    expect(formatBatch({ label: "x", startYear: 2006, endYear: 2013 })).toBe("21st batch (2006 - 2013)")
    expect(formatBatch({ label: "2006–2013" })).toBe("2006–2013") // no years → label
  })
})
