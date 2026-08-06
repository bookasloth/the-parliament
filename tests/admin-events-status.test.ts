import { describe, it, expect } from "vitest"
import { deriveEventStatus } from "@/modules/events/service"

// Admin list status is derived from the DB status enum + start time.
const now = new Date("2026-08-06T12:00:00Z")
const future = new Date("2026-09-01T10:00:00Z")
const past = new Date("2026-07-01T10:00:00Z")

describe("deriveEventStatus", () => {
  it("draft stays draft regardless of date", () => {
    expect(deriveEventStatus("draft", future, now)).toBe("draft")
    expect(deriveEventStatus("draft", past, now)).toBe("draft")
  })

  it("cancelled stays cancelled regardless of date", () => {
    expect(deriveEventStatus("cancelled", future, now)).toBe("cancelled")
  })

  it("completed maps to past", () => {
    expect(deriveEventStatus("completed", future, now)).toBe("past")
  })

  it("published future is upcoming, published past is past", () => {
    expect(deriveEventStatus("published", future, now)).toBe("upcoming")
    expect(deriveEventStatus("published", past, now)).toBe("past")
  })

  it("published starting exactly now counts as upcoming (>=)", () => {
    expect(deriveEventStatus("published", now, now)).toBe("upcoming")
  })
})
