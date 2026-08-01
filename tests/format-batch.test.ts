import { describe, it, expect } from "vitest"
import { formatBatch } from "@/app/(main)/feed/map-row"

describe("formatBatch", () => {
  it("returns undefined for null/undefined", () => {
    expect(formatBatch(null)).toBeUndefined()
    expect(formatBatch(undefined)).toBeUndefined()
  })

  it("composes ordinal + year range (JNV Nagpur 1st batch = 1986)", () => {
    expect(formatBatch({ label: "x", startYear: 1986, endYear: 1993 })).toBe("1st batch (1986 - 1993)")
    expect(formatBatch({ label: "x", startYear: 2006, endYear: 2013 })).toBe("21st batch (2006 - 2013)")
  })

  it("uses correct ordinal suffixes, incl. the 11–13 exception", () => {
    expect(formatBatch({ label: "x", startYear: 1987, endYear: 1994 })).toContain("2nd batch")
    expect(formatBatch({ label: "x", startYear: 1988, endYear: 1995 })).toContain("3rd batch")
    expect(formatBatch({ label: "x", startYear: 1996, endYear: 2003 })).toContain("11th batch")
    expect(formatBatch({ label: "x", startYear: 1997, endYear: 2004 })).toContain("12th batch")
    expect(formatBatch({ label: "x", startYear: 1998, endYear: 2005 })).toContain("13th batch")
    expect(formatBatch({ label: "x", startYear: 2007, endYear: 2014 })).toContain("22nd batch")
    expect(formatBatch({ label: "x", startYear: 2008, endYear: 2015 })).toContain("23rd batch")
  })

  it("drops the ordinal prefix when startYear predates the 1st batch", () => {
    expect(formatBatch({ label: "x", startYear: 1985, endYear: 1992 })).toBe("(1985 - 1992)")
  })

  it("falls back to the raw label when years are missing", () => {
    expect(formatBatch({ label: "2006-2013" })).toBe("2006-2013")
  })
})
