import { describe, it, expect } from "vitest"
import { organizeCommentThread, type ThreadNode } from "@/modules/feed/comment-thread"

type C = ThreadNode & { handle: string }
const handleOf = (c: C) => c.handle

describe("organizeCommentThread", () => {
  it("buckets replies under their top-level ancestor", () => {
    const comments: C[] = [
      { id: "top", parentId: null, handle: "alice" },
      { id: "r1", parentId: "top", handle: "bob" },
      { id: "r2", parentId: "top", handle: "carol" },
    ]
    const { roots, repliesByRoot } = organizeCommentThread(comments, handleOf)
    expect(roots.map((r) => r.id)).toEqual(["top"])
    expect(repliesByRoot.get("top")!.map((r) => r.comment.id)).toEqual(["r1", "r2"])
  })

  it("reply-to-top surfaces no target", () => {
    const comments: C[] = [
      { id: "top", parentId: null, handle: "alice" },
      { id: "r1", parentId: "top", handle: "bob" },
    ]
    const { repliesByRoot } = organizeCommentThread(comments, handleOf)
    expect(repliesByRoot.get("top")![0].replyingTo).toBeNull()
  })

  it("reply-to-a-reply surfaces the correct direct-parent author and stays one level", () => {
    const comments: C[] = [
      { id: "top", parentId: null, handle: "alice" },
      { id: "r1", parentId: "top", handle: "bob" }, // reply to top
      { id: "r2", parentId: "r1", handle: "carol" }, // reply to bob's reply
      { id: "r3", parentId: "r2", handle: "dave" }, // reply to carol's reply
    ]
    const { repliesByRoot } = organizeCommentThread(comments, handleOf)
    const bucket = repliesByRoot.get("top")!
    // All three flatten under the same top-level ancestor (one visual level).
    expect(bucket.map((r) => r.comment.id)).toEqual(["r1", "r2", "r3"])
    const byId = Object.fromEntries(bucket.map((r) => [r.comment.id, r.replyingTo]))
    expect(byId.r1).toBeNull() // replied to top → no target
    expect(byId.r2).toBe("bob") // replied to r1 (a reply) → target = bob
    expect(byId.r3).toBe("carol") // replied to r2 (a reply) → target = carol
  })

  it("drops replies whose ancestor is not in the page (rather than misplacing them)", () => {
    const comments: C[] = [
      { id: "top", parentId: null, handle: "alice" },
      { id: "orphan", parentId: "missing", handle: "bob" },
    ]
    const { repliesByRoot } = organizeCommentThread(comments, handleOf)
    expect(repliesByRoot.get("top")).toEqual([])
  })

  it("preserves input order within a bucket", () => {
    const comments: C[] = [
      { id: "top", parentId: null, handle: "a" },
      { id: "r3", parentId: "top", handle: "c" },
      { id: "r1", parentId: "top", handle: "b" },
      { id: "r2", parentId: "r1", handle: "b2" },
    ]
    const { repliesByRoot } = organizeCommentThread(comments, handleOf)
    expect(repliesByRoot.get("top")!.map((r) => r.comment.id)).toEqual(["r3", "r1", "r2"])
  })

  it("does not hang on a cyclic parent chain", () => {
    const comments: C[] = [
      { id: "top", parentId: null, handle: "a" },
      { id: "x", parentId: "y", handle: "b" },
      { id: "y", parentId: "x", handle: "c" },
    ]
    const { repliesByRoot } = organizeCommentThread(comments, handleOf)
    // Cycle never resolves to a root → both dropped, no infinite loop.
    expect(repliesByRoot.get("top")).toEqual([])
  })
})
