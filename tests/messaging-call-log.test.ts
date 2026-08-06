import { describe, it, expect } from "vitest"
import { formatDuration, callLabel } from "@/modules/messaging/call-log"
import type { CallData } from "@/modules/messaging/types"

const call = (over: Partial<CallData>): CallData => ({
  status: "completed", audioOnly: false, endedAt: null, durationSec: 0, ...over,
})

describe("formatDuration", () => {
  it("0 seconds", () => expect(formatDuration(0)).toBe("0:00"))
  it("under a minute pads seconds", () => expect(formatDuration(5)).toBe("0:05"))
  it("minutes and seconds", () => expect(formatDuration(125)).toBe("2:05"))
  it("exactly an hour switches to h:mm:ss", () => expect(formatDuration(3600)).toBe("1:00:00"))
  it("hours, minutes, seconds", () => expect(formatDuration(3661)).toBe("1:01:01"))
  it("floors fractional seconds", () => expect(formatDuration(9.9)).toBe("0:09"))
  it("clamps negatives to zero", () => expect(formatDuration(-5)).toBe("0:00"))
})

describe("callLabel", () => {
  it("ringing reads Calling… to the caller", () => {
    expect(callLabel(call({ status: "ringing" }), true)).toBe("Calling…")
  })
  it("ringing reads Incoming call to the callee", () => {
    expect(callLabel(call({ status: "ringing" }), false)).toBe("Incoming call")
  })
  it("missed reads No answer to the caller", () => {
    expect(callLabel(call({ status: "missed", durationSec: null }), true)).toBe("No answer")
  })
  it("missed reads Missed call to the callee", () => {
    expect(callLabel(call({ status: "missed", durationSec: null }), false)).toBe("Missed call")
  })
  it("completed video call shows kind + duration, same for both sides", () => {
    const c = call({ status: "completed", audioOnly: false, durationSec: 192 })
    expect(callLabel(c, true)).toBe("Video call · 3:12")
    expect(callLabel(c, false)).toBe("Video call · 3:12")
  })
  it("completed audio call labels the kind", () => {
    expect(callLabel(call({ status: "completed", audioOnly: true, durationSec: 60 }), false)).toBe("Audio call · 1:00")
  })
  it("completed with null duration falls back to 0:00", () => {
    expect(callLabel(call({ status: "completed", durationSec: null }), true)).toBe("Video call · 0:00")
  })
})
