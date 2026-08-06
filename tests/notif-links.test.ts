import { describe, it, expect } from "vitest"
import { buildNotifLinks } from "@/modules/notifications/links"

const noUsers = new Map<string, string | null>()

describe("buildNotifLinks", () => {
  it("post → /feed/:id with a View post CTA", () => {
    const l = buildNotifLinks({ type: "comment_on_post", entityType: "post", entityId: "p1" }, noUsers)
    expect(l.href).toBe("/feed/p1")
    expect(l.ctas[0]).toEqual({ label: "View post", href: "/feed/p1", primary: true })
  })

  it("conversation → /messages/:id with Reply", () => {
    const l = buildNotifLinks({ type: "new_message", entityType: "conversation", entityId: "c1" }, noUsers)
    expect(l.href).toBe("/messages/c1")
    expect(l.ctas[0].label).toBe("Reply")
  })

  it("user → /:username when the username resolves", () => {
    const l = buildNotifLinks({ type: "new_follower", entityType: "user", entityId: "u1" }, new Map([["u1", "alice"]]))
    expect(l.href).toBe("/alice")
    expect(l.ctas[0].label).toBe("View profile")
  })

  it("user with no resolved username → safe fallback, no CTA (never a 404)", () => {
    const l = buildNotifLinks({ type: "new_follower", entityType: "user", entityId: "u1" }, noUsers)
    expect(l.href).toBe("/notifications")
    expect(l.ctas).toHaveLength(0)
  })

  it("event → /events/:id (route param is the id)", () => {
    const l = buildNotifLinks({ type: "new_event_in_batch", entityType: "event", entityId: "e1" }, noUsers)
    expect(l.href).toBe("/events/e1")
    expect(l.ctas[0].label).toBe("View event")
  })

  it("verification/committee → /membership", () => {
    expect(buildNotifLinks({ type: "verification_approved", entityType: "alumni_verification", entityId: "v1" }, noUsers).href).toBe("/membership")
    expect(buildNotifLinks({ type: "verification_approved", entityType: "committee_invite", entityId: "ci1" }, noUsers).href).toBe("/membership")
  })

  it("null entity → /notifications, no CTA", () => {
    const l = buildNotifLinks({ type: "whatever", entityType: null, entityId: null }, noUsers)
    expect(l.href).toBe("/notifications")
    expect(l.ctas).toHaveLength(0)
  })
})
