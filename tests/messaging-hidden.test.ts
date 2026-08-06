import { describe, it, expect } from "vitest"
import { isChatHidden } from "@/modules/messaging/service"

const t = (s: number) => new Date(s * 1000)

describe("isChatHidden", () => {
  it("never cleared → visible", () => {
    expect(isChatHidden(null, t(100))) .toBe(false)
  })
  it("cleared, no messages since → hidden", () => {
    expect(isChatHidden(t(100), t(50))).toBe(true)
  })
  it("cleared, newer message → revealed", () => {
    expect(isChatHidden(t(100), t(150))).toBe(false)
  })
  it("message exactly at clearedAt → still hidden (that message was cleared)", () => {
    expect(isChatHidden(t(100), t(100))).toBe(true)
  })
  it("no lastMessageAt → not hidden (such chats aren't listed anyway)", () => {
    expect(isChatHidden(t(100), null)).toBe(false)
  })
})
