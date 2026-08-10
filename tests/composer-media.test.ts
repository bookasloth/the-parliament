import { describe, it, expect } from "vitest"
import {
  validateComposerMedia,
  isVideoMime,
  POST_MEDIA_MAX_BYTES,
  POST_MEDIA_MIME_TYPES,
} from "@/modules/feed/media-limits"

describe("validateComposerMedia", () => {
  it("accepts a video within the size + mime limits (first-class alongside images)", () => {
    expect(validateComposerMedia({ type: "video/mp4", size: 10 * 1024 * 1024 })).toEqual({ ok: true })
    expect(validateComposerMedia({ type: "video/webm", size: 1 })).toEqual({ ok: true })
    expect(validateComposerMedia({ type: "video/quicktime", size: 1 })).toEqual({ ok: true })
  })

  it("accepts images too", () => {
    expect(validateComposerMedia({ type: "image/jpeg", size: 500 })).toEqual({ ok: true })
    expect(validateComposerMedia({ type: "image/png", size: 500 })).toEqual({ ok: true })
    expect(validateComposerMedia({ type: "image/gif", size: 500 })).toEqual({ ok: true })
  })

  it("accepts a video exactly at the 64 MB cap but rejects one over it", () => {
    expect(validateComposerMedia({ type: "video/mp4", size: POST_MEDIA_MAX_BYTES }).ok).toBe(true)
    const over = validateComposerMedia({ type: "video/mp4", size: POST_MEDIA_MAX_BYTES + 1 })
    expect(over.ok).toBe(false)
    if (!over.ok) expect(over.reason).toMatch(/64 MB/)
  })

  it("rejects unsupported mime types (incl. non-post video/audio)", () => {
    expect(validateComposerMedia({ type: "application/pdf", size: 10 }).ok).toBe(false)
    expect(validateComposerMedia({ type: "video/avi", size: 10 }).ok).toBe(false)
    expect(validateComposerMedia({ type: "audio/mpeg", size: 10 }).ok).toBe(false)
    expect(validateComposerMedia({ type: "", size: 10 }).ok).toBe(false)
  })

  it("rejects empty files", () => {
    expect(validateComposerMedia({ type: "image/png", size: 0 }).ok).toBe(false)
  })

  it("cap is 64 MB", () => {
    expect(POST_MEDIA_MAX_BYTES).toBe(64 * 1024 * 1024)
  })
})

describe("isVideoMime", () => {
  it("flags video mimes and only those", () => {
    expect(isVideoMime("video/mp4")).toBe(true)
    expect(isVideoMime("image/png")).toBe(false)
    for (const t of POST_MEDIA_MIME_TYPES) {
      expect(isVideoMime(t)).toBe(t.startsWith("video/"))
    }
  })
})
