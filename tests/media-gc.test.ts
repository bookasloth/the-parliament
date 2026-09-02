import { describe, it, expect } from "vitest"
import { postMediaKeys } from "@/modules/media/gc"

describe("postMediaKeys", () => {
  it("returns only real R2 post-media keys", () => {
    const media = [
      { key: "posts/u1/a.jpg", type: "image", url: "https://cdn/posts/u1/a.jpg" },
      { key: "posts/u1/b.mp4", type: "video", url: "https://cdn/posts/u1/b.mp4" },
    ]
    expect(postMediaKeys(media)).toEqual(["posts/u1/a.jpg", "posts/u1/b.mp4"])
  })

  it("skips avatar-embed entries (Supabase URL as key) so a live avatar is never deleted", () => {
    const media = [
      { key: "https://x.supabase.co/storage/v1/object/public/avatars/u1/pic.jpg", type: "image", url: "…" },
    ]
    expect(postMediaKeys(media)).toEqual([])
  })

  it("is empty for text posts and malformed input", () => {
    expect(postMediaKeys([])).toEqual([])
    expect(postMediaKeys(null)).toEqual([])
    expect(postMediaKeys(undefined)).toEqual([])
    expect(postMediaKeys("nope")).toEqual([])
    expect(postMediaKeys([{ type: "image" }, { key: 42 }])).toEqual([])
  })
})
