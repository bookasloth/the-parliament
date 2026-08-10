import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "node:crypto"
import { POST_MEDIA_MAX_BYTES, POST_MEDIA_MIME_TYPES } from "@/modules/feed/media-limits"

let cachedClient: S3Client | null = null

function getClient(): S3Client {
  if (cachedClient) return cachedClient
  cachedClient = new S3Client({
    // "auto" works for Cloudflare R2; Supabase Storage (and most S3 impls) need
    // the real region + path-style addressing — both env-driven so either works.
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  })
  return cachedClient
}

function bucket(): string {
  const b = process.env.R2_BUCKET
  if (!b) throw new Error("R2_BUCKET env not set")
  return b
}

export type UploadKind = "verification" | "avatar" | "post" | "business" | "event_banner"

const PREFIX: Record<UploadKind, string> = {
  verification: "verification",
  avatar: "avatars",
  post: "posts",
  business: "businesses",
  event_banner: "events",
}

const MAX_BYTES: Record<UploadKind, number> = {
  verification: 10 * 1024 * 1024,
  avatar: 4 * 1024 * 1024,
  post: POST_MEDIA_MAX_BYTES, // shared with the client composer
  business: 4 * 1024 * 1024,
  event_banner: 6 * 1024 * 1024,
}

const ALLOWED_MIME: Record<UploadKind, string[]> = {
  verification: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  avatar: ["image/jpeg", "image/png", "image/webp"],
  post: [...POST_MEDIA_MIME_TYPES], // shared with the client composer
  business: ["image/jpeg", "image/png", "image/webp"],
  event_banner: ["image/jpeg", "image/png", "image/webp"],
}

// The object-key extension is derived from the (allowlist-checked) content type,
// never from a client-supplied `ext` — otherwise a caller could key an object
// `.html`/`.svg` while it is stored as image/png, which a CDN that types by
// extension could re-serve as markup.
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
}

export interface SignedUpload {
  key: string
  uploadUrl: string
  maxBytes: number
}

export async function getSignedUpload(opts: {
  kind: UploadKind
  ownerId: string
  contentType: string
}): Promise<SignedUpload> {
  if (!ALLOWED_MIME[opts.kind].includes(opts.contentType)) {
    throw new Error(`Content type ${opts.contentType} not allowed for ${opts.kind}`)
  }

  const ext = MIME_EXT[opts.contentType] ?? "bin"
  const id = crypto.randomUUID()
  const key = `${PREFIX[opts.kind]}/${opts.ownerId}/${id}.${ext}`

  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: opts.contentType,
  })

  const uploadUrl = await getSignedUrl(getClient(), cmd, { expiresIn: 60 * 5 })

  return { key, uploadUrl, maxBytes: MAX_BYTES[opts.kind] }
}

export async function getSignedReadUrl(key: string, expiresInSeconds = 60 * 15): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key })
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresInSeconds })
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
}

export function publicUrlFor(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL
  if (!base) return key
  return `${base.replace(/\/$/, "")}/${key}`
}

/** True only if `key` is under this owner's own post-media prefix. */
export function isOwnedPostKey(ownerId: string, key: string): boolean {
  return key.startsWith(`${PREFIX.post}/${ownerId}/`)
}

/** HEAD an object; returns its byte size, or null if it can't be read. */
export async function objectSize(key: string): Promise<number | null> {
  try {
    const r = await getClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }))
    return r.ContentLength ?? null
  } catch {
    return null
  }
}

/**
 * Validate post media the client asks to attach. The presigned PUT can't enforce
 * a size limit (SigV4 PUT carries no content-length-range) and createPost trusts
 * a client-supplied object key — so at attach time we (1) reject any key outside
 * the caller's own posts/<userId>/ prefix and (2) HEAD the object and delete +
 * reject anything over the post size cap. A caller can still upload an oversized
 * blob that is never attached; a bucket lifecycle rule / presigned-POST rollout
 * is the complete fix (tracked as a follow-up).
 */
export async function validatePostMedia(ownerId: string, keys: string[]): Promise<void> {
  for (const key of keys) {
    if (!isOwnedPostKey(ownerId, key)) {
      throw new Error("Invalid media reference")
    }
    const size = await objectSize(key)
    if (size !== null && size > MAX_BYTES.post) {
      await deleteObject(key).catch(() => {})
      throw new Error("Uploaded media exceeds the size limit")
    }
  }
}
