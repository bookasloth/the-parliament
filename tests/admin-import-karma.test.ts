import { describe, it, expect } from "vitest"
import { parseUserCsv, adjustKarmaSchema } from "@/modules/admin/users"

describe("parseUserCsv", () => {
  it("parses name,email rows", () => {
    const r = parseUserCsv("Neha Gupta,neha@x.com\nAmit Verma,amit@y.com")
    expect(r.rows).toEqual([
      { legalName: "Neha Gupta", email: "neha@x.com" },
      { legalName: "Amit Verma", email: "amit@y.com" },
    ])
    expect(r.errors).toEqual([])
  })

  it("skips a header row", () => {
    const r = parseUserCsv("Name,Email\nNeha,neha@x.com")
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].email).toBe("neha@x.com")
  })

  it("accepts email,name order and lowercases email", () => {
    const r = parseUserCsv("AMIT@Y.COM,Amit Verma")
    expect(r.rows[0]).toEqual({ legalName: "Amit Verma", email: "amit@y.com" })
  })

  it("ignores blank lines", () => {
    expect(parseUserCsv("\n\nNeha,neha@x.com\n\n").rows).toHaveLength(1)
  })

  it("flags rows with no valid email or missing name", () => {
    const r = parseUserCsv("Neha,bogus-value\n,lonely@x.com")
    expect(r.rows).toHaveLength(0)
    expect(r.errors).toHaveLength(2)
  })

  it("dedupes repeated emails within the file", () => {
    const r = parseUserCsv("Neha,dup@x.com\nNeha2,dup@x.com")
    expect(r.rows).toHaveLength(1)
    expect(r.errors[0]).toMatch(/duplicate/)
  })
})

describe("adjustKarmaSchema", () => {
  it("accepts a positive and negative integer delta with reason", () => {
    expect(adjustKarmaSchema.parse({ delta: 50, reason: "contest win" }).delta).toBe(50)
    expect(adjustKarmaSchema.parse({ delta: -20, reason: "penalty" }).delta).toBe(-20)
  })

  it("rejects zero, non-integer, oversized, or empty reason", () => {
    expect(() => adjustKarmaSchema.parse({ delta: 0, reason: "x" })).toThrow()
    expect(() => adjustKarmaSchema.parse({ delta: 1.5, reason: "x" })).toThrow()
    expect(() => adjustKarmaSchema.parse({ delta: 999999, reason: "x" })).toThrow()
    expect(() => adjustKarmaSchema.parse({ delta: 10, reason: "" })).toThrow()
  })
})
