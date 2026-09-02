import crypto from "node:crypto"

// Uploads to Supabase Storage via its REST API using the service-role key
// (server-only). Avoids pulling in @supabase/supabase-js — we stay Prisma-only.
const BUCKET = "avatars"

function config() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
  return { url: url.replace(/\/$/, ""), key }
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

export function isAllowedImage(contentType: string): boolean {
  return contentType in EXT
}

/**
 * Sniff the real image type from the leading magic bytes, ignoring the
 * client-declared Content-Type. Returns null for anything that isn't one of our
 * allowed raster formats (e.g. HTML/SVG/script bytes mislabelled as image/png).
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  const b = bytes
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png"
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg"
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // "WEBP"
  ) return "image/webp"
  return null
}

/** Base prefix every public storage URL we generate starts with. Empty when
 *  Supabase storage isn't configured (env unset), in which case no URL passes. */
function publicBase(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return ""
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`
}

/** True only for URLs pointing at our own Supabase public storage bucket —
 *  used to reject arbitrary third-party media URLs supplied by a client. */
export function isOurPublicUrl(url: string): boolean {
  const base = publicBase()
  return base.length > 0 && url.startsWith(base)
}

async function uploadImage(prefix: string, userId: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const { url, key } = config()
  const ext = EXT[contentType]
  if (!ext) throw new Error("Unsupported image type")

  // Verify the bytes actually are the image type claimed — don't trust the
  // declared Content-Type (which a client can spoof to smuggle HTML/SVG/script).
  const sniffed = sniffImageMime(bytes)
  if (sniffed !== contentType) {
    throw new Error("File content does not match a supported image type")
  }

  const path = `${prefix}${userId}/${crypto.randomBytes(8).toString("hex")}.${ext}`

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": contentType,
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000",
    },
    body: bytes as unknown as BodyInit,
  })
  if (!res.ok) {
    throw new Error(`Storage upload failed (${res.status}): ${await res.text().catch(() => "")}`)
  }
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`
}

export async function uploadAvatar(userId: string, bytes: Uint8Array, contentType: string): Promise<string> {
  return uploadImage("", userId, bytes, contentType)
}

export async function uploadCover(userId: string, bytes: Uint8Array, contentType: string): Promise<string> {
  return uploadImage("covers/", userId, bytes, contentType)
}

export async function uploadMessageImage(userId: string, bytes: Uint8Array, contentType: string): Promise<string> {
  return uploadImage("messages/", userId, bytes, contentType)
}

export async function uploadCommentImage(userId: string, bytes: Uint8Array, contentType: string): Promise<string> {
  return uploadImage("comments/", userId, bytes, contentType)
}

// ---------------------------------------------------------------------------
// Gallery objects. Admin-uploaded public photos. These ride the same public
// bucket as avatars, under a date-partitioned `gallery/YYYY/MM/` prefix — the
// repo's storage story is one public bucket with prefixes, so no new bucket or
// Supabase config is needed. Writes happen only from admin-gated server actions
// using the service-role key; the browser never writes to the bucket.
// Allowlist stays png/jpeg/webp — the same magic-byte set `sniffImageMime`
// validates. (gif/avif deferred: they'd need new byte-sniffing surface.)
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, "0")

/** Upload one gallery photo and return its public URL + storage path. The path
 *  is what we persist so we can delete the object later. Content is verified by
 *  magic bytes, not the declared type. */
export async function uploadGalleryImage(
  bytes: Uint8Array,
  contentType: string,
  now: Date = new Date(),
): Promise<{ url: string; path: string }> {
  const { url, key } = config()
  const ext = EXT[contentType]
  if (!ext) throw new Error("Unsupported image type")
  if (sniffImageMime(bytes) !== contentType) {
    throw new Error("File content does not match a supported image type")
  }

  const path = `gallery/${now.getUTCFullYear()}/${pad2(now.getUTCMonth() + 1)}/${crypto.randomBytes(8).toString("hex")}.${ext}`

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": contentType,
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000",
    },
    body: bytes as unknown as BodyInit,
  })
  if (!res.ok) {
    throw new Error(`Storage upload failed (${res.status}): ${await res.text().catch(() => "")}`)
  }
  return { url: `${url}/storage/v1/object/public/${BUCKET}/${path}`, path }
}

/** Upload a committee member headshot. Same public bucket, `committee/` prefix.
 *  Returns the public URL. Admin-gated callers only. */
export async function uploadCommitteePhoto(key: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const cfg = config()
  const ext = EXT[contentType]
  if (!ext) throw new Error("Unsupported image type")
  if (sniffImageMime(bytes) !== contentType) throw new Error("File content does not match a supported image type")
  const safeKey = key.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "member"
  const path = `committee/${safeKey}-${crypto.randomBytes(4).toString("hex")}.${ext}`
  const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, apikey: cfg.key, "Content-Type": contentType, "x-upsert": "true", "cache-control": "public, max-age=31536000" },
    body: bytes as unknown as BodyInit,
  })
  if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${await res.text().catch(() => "")}`)
  return `${cfg.url}/storage/v1/object/public/${BUCKET}/${path}`
}

/** Delete a stored object by its `storage_path`. Best-effort: throws only if the
 *  request itself fails, so callers can treat cleanup as non-fatal. A 404 (object
 *  already gone) is treated as success. */
/** Extract the in-bucket path from one of our public storage URLs, or null if
 *  the URL isn't ours. The inverse of the public URL builder. */
export function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const base = publicBase()
  if (!base || !url.startsWith(base)) return null
  const path = url.slice(base.length)
  return path.length > 0 ? path : null
}

export async function deleteStorageObject(path: string): Promise<void> {
  const { url, key } = config()
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Storage delete failed (${res.status})`)
  }
}
