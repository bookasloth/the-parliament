import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "node:crypto"

let cachedClient: S3Client | null = null

function getClient(): S3Client {
  if (cachedClient) return cachedClient
  cachedClient = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
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
  post: 10 * 1024 * 1024,
  business: 4 * 1024 * 1024,
  event_banner: 6 * 1024 * 1024,
}

const ALLOWED_MIME: Record<UploadKind, string[]> = {
  verification: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  avatar: ["image/jpeg", "image/png", "image/webp"],
  post: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  business: ["image/jpeg", "image/png", "image/webp"],
  event_banner: ["image/jpeg", "image/png", "image/webp"],
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
  ext: string
}): Promise<SignedUpload> {
  if (!ALLOWED_MIME[opts.kind].includes(opts.contentType)) {
    throw new Error(`Content type ${opts.contentType} not allowed for ${opts.kind}`)
  }

  const cleanExt = opts.ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 5)
  const id = crypto.randomUUID()
  const key = `${PREFIX[opts.kind]}/${opts.ownerId}/${id}.${cleanExt}`

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
