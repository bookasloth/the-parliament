import { describe, it, expect } from "vitest"
import { notifVisual } from "@/modules/notifications/visuals"
import { Bell, Flame, UserPlus, AtSign } from "lucide-react"

describe("notifVisual", () => {
  it("maps known kinds to distinct badges", () => {
    expect(notifVisual("new_follower").Icon).toBe(UserPlus)
    expect(notifVisual("mention").Icon).toBe(AtSign)
    expect(notifVisual("reaction_on_post").Icon).toBe(Flame)
  })

  it("shares one visual across sibling reaction kinds", () => {
    expect(notifVisual("reaction_on_comment").Icon).toBe(Flame)
    expect(notifVisual("reaction_on_post").bg).toBe(notifVisual("reaction_on_comment").bg)
  })

  it("falls back to a bell for unknown/empty kinds", () => {
    expect(notifVisual("something_new").Icon).toBe(Bell)
    expect(notifVisual("").Icon).toBe(Bell)
  })

  it("every visual has an icon and a bg class", () => {
    for (const t of ["new_follower", "comment_on_post", "award_on_post", "moderation_warning", "incoming_call"]) {
      const v = notifVisual(t)
      expect(v.Icon).toBeTypeOf("object")
      expect(v.bg).toMatch(/^bg-/)
    }
  })
})
