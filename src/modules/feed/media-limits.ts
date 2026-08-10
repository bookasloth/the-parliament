// Single source of truth for post-media limits, shared by the client composer
// (validate before uploading) and the server signer (r2.ts). DB-free / dep-free
// so it imports safely into a client component and unit-tests without a DB.

/** Max bytes for a single post media file (image or video). */
export const POST_MEDIA_MAX_BYTES = 64 * 1024 * 1024 // 64 MB

/** Content types accepted for post media. */
export const POST_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const

export type PostMediaMime = (typeof POST_MEDIA_MIME_TYPES)[number]

export function isVideoMime(type: string): boolean {
  return type.startsWith("video/")
}

export type MediaValidation = { ok: true } | { ok: false; reason: string }

/**
 * Validate one composer file before uploading: mime must be allowlisted, size
 * within the cap (0-byte rejected). Both image and video are first-class here —
 * video passes on the same footing as image, subject to the same 64 MB cap.
 */
export function validateComposerMedia(file: { type: string; size: number }): MediaValidation {
  if (!POST_MEDIA_MIME_TYPES.includes(file.type as PostMediaMime)) {
    return { ok: false, reason: "Unsupported file type" }
  }
  if (file.size <= 0) return { ok: false, reason: "Empty file" }
  if (file.size > POST_MEDIA_MAX_BYTES) {
    return { ok: false, reason: "File exceeds the 64 MB limit" }
  }
  return { ok: true }
}
