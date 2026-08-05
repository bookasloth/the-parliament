import { describe, it, expect } from "vitest"
import { parseBatchValue } from "@/lib/houses"

describe("parseBatchValue", () => {
  it("parses a well-formed batch value", () => {
    expect(parseBatchValue("1986-1993")).toEqual({ startYear: 1986, endYear: 1993 })
  })

  it("trims surrounding whitespace", () => {
    expect(parseBatchValue("  2010-2017 ")).toEqual({ startYear: 2010, endYear: 2017 })
  })

  it.each([
    "",
    "1986",
    "1986-",
    "86-93",
    "1986/1993",
    "1986-1993-2000",
    "abcd-efgh",
  ])("rejects malformed input %j", (v) => {
    expect(parseBatchValue(v)).toBeNull()
  })

  it("rejects a non-increasing range", () => {
    expect(parseBatchValue("1993-1986")).toBeNull()
    expect(parseBatchValue("2000-2000")).toBeNull()
  })
})
