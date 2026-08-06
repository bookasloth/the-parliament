import { describe, it, expect } from "vitest"
import { nextReaction, applyReaction, groupReactions } from "@/modules/messaging/reactions"
import type { MessageView } from "@/modules/messaging/types"

function msg(id: string, reactions: MessageView["reactions"] = []): MessageView {
  return {
    id, senderId: "u1", body: "hi", media: [], createdAt: "2026-01-01T00:00:00.000Z",
    editedAt: null, deleted: false, reactions, replyTo: null,
  }
}

describe("nextReaction", () => {
  it("adds a reaction when none exists", () => {
    expect(nextReaction(null, "❤️")).toEqual({ removed: false, emoji: "❤️" })
  })
  it("removes when tapping the same emoji (toggle off)", () => {
    expect(nextReaction("❤️", "❤️")).toEqual({ removed: true, emoji: null })
  })
  it("replaces when tapping a different emoji", () => {
    expect(nextReaction("❤️", "😂")).toEqual({ removed: false, emoji: "😂" })
  })
})

describe("applyReaction", () => {
  it("adds the viewer's reaction to the right message only", () => {
    const out = applyReaction([msg("a"), msg("b")], "a", "me", "🔥", false)
    expect(out[0].reactions).toEqual([{ emoji: "🔥", userId: "me" }])
    expect(out[1].reactions).toEqual([])
  })

  it("replaces the viewer's existing reaction rather than stacking", () => {
    const start = [msg("a", [{ emoji: "❤️", userId: "me" }, { emoji: "❤️", userId: "them" }])]
    const out = applyReaction(start, "a", "me", "😂", false)
    expect(out[0].reactions).toEqual([{ emoji: "❤️", userId: "them" }, { emoji: "😂", userId: "me" }])
  })

  it("removes only the viewer's reaction on toggle-off", () => {
    const start = [msg("a", [{ emoji: "❤️", userId: "me" }, { emoji: "❤️", userId: "them" }])]
    const out = applyReaction(start, "a", "me", "❤️", true)
    expect(out[0].reactions).toEqual([{ emoji: "❤️", userId: "them" }])
  })

  it("does not mutate the input array or message", () => {
    const start = [msg("a", [{ emoji: "❤️", userId: "them" }])]
    const snapshot = JSON.parse(JSON.stringify(start))
    applyReaction(start, "a", "me", "🔥", false)
    expect(start).toEqual(snapshot)
  })
})

describe("groupReactions", () => {
  it("counts per emoji, first-seen order preserved", () => {
    const grouped = groupReactions([
      { emoji: "❤️", userId: "a" },
      { emoji: "😂", userId: "b" },
      { emoji: "❤️", userId: "c" },
    ])
    expect(grouped).toEqual([["❤️", 2], ["😂", 1]])
  })
  it("returns empty for no reactions", () => {
    expect(groupReactions([])).toEqual([])
  })
})
