import { describe, it, expect } from "vitest"
import { relativeTime } from "@/lib/relative-time"

const now = new Date("2026-08-02T12:00:00Z")
const ago = (ms: number) => new Date(now.getTime() - ms)

describe("relativeTime", () => {
  it("sub-minute → just now", () => {
    expect(relativeTime(ago(0), now)).toBe("just now")
    expect(relativeTime(ago(59_000), now)).toBe("just now")
  })

  it("minutes", () => {
    expect(relativeTime(ago(60_000), now)).toBe("1 min ago")
    expect(relativeTime(ago(59 * 60_000), now)).toBe("59 min ago")
  })

  it("hours", () => {
    expect(relativeTime(ago(3_600_000), now)).toBe("1 hr ago")
    expect(relativeTime(ago(23 * 3_600_000), now)).toBe("23 hr ago")
  })

  it("days with singular/plural", () => {
    expect(relativeTime(ago(86_400_000), now)).toBe("1 day ago")
    expect(relativeTime(ago(2 * 86_400_000), now)).toBe("2 days ago")
    expect(relativeTime(ago(400 * 86_400_000), now)).toBe("400 days ago")
  })

  it("future/zero clamps to just now", () => {
    expect(relativeTime(new Date(now.getTime() + 5000), now)).toBe("just now")
  })
})
