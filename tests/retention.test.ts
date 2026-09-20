import { describe, it, expect } from "vitest"
import {
  retentionCutoff,
  IMPRESSION_RETENTION_DAYS,
  NOTIFICATION_RETENTION_DAYS,
} from "@/modules/retention/prune"

describe("retentionCutoff", () => {
  it("subtracts the given days (ms-exact, DST-agnostic)", () => {
    const now = new Date("2026-09-20T00:00:00.000Z")
    expect(retentionCutoff(now, 90).toISOString()).toBe("2026-06-22T00:00:00.000Z")
  })

  it("0 days is the same instant", () => {
    const now = new Date("2026-09-20T12:34:56.000Z")
    expect(retentionCutoff(now, 0).getTime()).toBe(now.getTime())
  })

  it("preserves time-of-day", () => {
    const now = new Date("2026-09-20T08:15:00.000Z")
    expect(retentionCutoff(now, 1).toISOString()).toBe("2026-09-19T08:15:00.000Z")
  })

  it("retention windows are sane positive defaults", () => {
    expect(IMPRESSION_RETENTION_DAYS).toBeGreaterThan(0)
    expect(NOTIFICATION_RETENTION_DAYS).toBeGreaterThan(0)
  })
})
