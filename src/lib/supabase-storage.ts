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
