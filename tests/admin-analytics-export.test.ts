import { describe, it, expect } from "vitest"
import { csvCell } from "@/app/api/admin/analytics/export/csv"

describe("csvCell", () => {
  it("passes plain values through unquoted", () => {
    expect(csvCell("hello")).toBe("hello")
    expect(csvCell(42)).toBe("42")
  })

  it("renders null/undefined as empty string", () => {
    expect(csvCell(null)).toBe("")
    expect(csvCell(undefined)).toBe("")
  })

  it("quotes cells containing a comma", () => {
    expect(csvCell("Doe, John")).toBe('"Doe, John"')
  })

  it("quotes and doubles embedded quotes", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it("quotes cells containing newlines", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"')
    expect(csvCell("cr\rlf")).toBe('"cr\rlf"')
  })
})
