import { describe, it, expect } from "vitest"
import { endorserScore, summarizeEndorsementRows } from "@/modules/verification/endorsements-logic"

describe("endorserScore", () => {
  it("ranks batch+house highest", () => {
    expect(endorserScore(true, true)).toEqual({ score: 3, reason: "Same batch & house" })
  })
  it("batch outranks house", () => {
    expect(endorserScore(true, false).score).toBe(2)
    expect(endorserScore(false, true).score).toBe(1)
    expect(endorserScore(true, false).score).toBeGreaterThan(endorserScore(false, true).score)
  })
  it("neither → year-overlap fallback, score 0", () => {
    expect(endorserScore(false, false)).toEqual({ score: 0, reason: "Studied in the same years" })
  })
})

describe("summarizeEndorsementRows", () => {
  it("returns zeroed rows for ids with no endorsements", () => {
    const m = summarizeEndorsementRows(["v1", "v2"], [])
    expect(m.get("v1")).toEqual({ asked: 0, endorsed: 0, declined: 0 })
    expect(m.get("v2")).toEqual({ asked: 0, endorsed: 0, declined: 0 })
  })

  it("folds counts by status into asked/endorsed/declined", () => {
    const m = summarizeEndorsementRows(
      ["v1"],
      [
        { verificationId: "v1", status: "pending", count: 2 },
        { verificationId: "v1", status: "endorsed", count: 3 },
        { verificationId: "v1", status: "declined", count: 1 },
      ],
    )
    expect(m.get("v1")).toEqual({ asked: 6, endorsed: 3, declined: 1 })
  })

  it("counts unknown/expired statuses toward asked only", () => {
    const m = summarizeEndorsementRows("v1".split("|"), [
      { verificationId: "v1", status: "expired", count: 4 },
    ])
    expect(m.get("v1")).toEqual({ asked: 4, endorsed: 0, declined: 0 })
  })

  it("ignores rows for ids not in the requested set", () => {
    const m = summarizeEndorsementRows(["v1"], [
      { verificationId: "v2", status: "endorsed", count: 9 },
    ])
    expect(m.get("v1")).toEqual({ asked: 0, endorsed: 0, declined: 0 })
    expect(m.has("v2")).toBe(false)
  })

  it("empty id set → empty map", () => {
    expect(summarizeEndorsementRows([], []).size).toBe(0)
  })
})
