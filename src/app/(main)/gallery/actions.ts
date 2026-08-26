"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit"
import { isAllowedImage } from "@/lib/supabase-storage"
import {
  assertVerifiedMember, createMemberAlbum, createGalleryImage, deleteImageAsMember,
} from "@/modules/gallery/service"
import type { GalleryAlbumDTO, GalleryImageDTO } from "@/modules/gallery/types"
import { galleryQuotaBytes } from "@/config/membership"

// Member (collaborative) gallery actions. Every write requires a logged-in,
// verified member. Uploads are server-mediated (service-role write happens
// inside the service) — the browser never touches the bucket. Photos publish
// instantly; moderation is report + uploader/admin delete.

type Result<T = unknown> = ({ ok: true } & T) | { error: string }

const MAX_BYTES = 5 * 1024 * 1024

function fail(e: unknown): { error: string } {
  if (e instanceof RateLimitedError) return { error: "You're doing that too fast — try again in a bit." }
  if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Invalid input" }
  if (e instanceof Error) return { error: e.message }
  return { error: "Something went wrong" }
}

function revalidateGallery(slug?: string) {
  revalidatePath("/gallery")
  if (slug) revalidatePath(`/gallery/${slug}`)
}

const albumSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  eventId: z.string().uuid().nullable().optional(),
})

export async function createMemberAlbumAction(input: unknown): Promise<Result<{ album: GalleryAlbumDTO }>> {
  try {
    const user = await requireUser()
    await assertVerifiedMember(user.id)
    await enforceRateLimit({ bucket: "gallery.album", identifier: user.id, limit: 10, windowSec: 3600 })
    const parsed = albumSchema.parse(input)
    const album = await createMemberAlbum({
      title: parsed.title,
      description: parsed.description,
      createdById: user.id,
      eventId: parsed.eventId ?? null,
    })
    revalidateGallery()
    return { ok: true, album }
  } catch (e) {
    return fail(e)
  }
}

export async function uploadMemberPhotoAction(formData: FormData): Promise<Result<{ image: GalleryImageDTO }>> {
  try {
    const user = await requireUser()
    await assertVerifiedMember(user.id)
    await enforceRateLimit({ bucket: "gallery.upload", identifier: user.id, limit: 60, windowSec: 3600 })

    const file = formData.get("file")
    if (!(file instanceof File)) return { error: "No file provided" }
    if (!isAllowedImage(file.type)) return { error: "Unsupported image type (use JPEG, PNG, or WebP)" }
    if (file.size > MAX_BYTES) return { error: "Image exceeds the 5MB limit" }

    // Per-tier total-storage quota (previously unbounded). Sum the member's
    // existing gallery bytes and reject if this upload would exceed their cap.
    const quota = galleryQuotaBytes(user.membershipStatus)
    const usedAgg = await prisma.galleryImage.aggregate({
      _sum: { fileSize: true },
      where: { uploadedById: user.id },
    })
    const used = Number(usedAgg._sum.fileSize ?? 0)
    if (used + file.size > quota) {
      const mb = (n: number) => Math.round(n / (1024 * 1024))
      return { error: `Storage full — you've used ${mb(used)}MB of your ${mb(quota)}MB gallery space. Upgrade your membership for more, or delete some photos.` }
    }

    const albumId = String(formData.get("albumId") || "")
    if (!albumId) return { error: "Missing album" }
    const width = Number(formData.get("width"))
    const height = Number(formData.get("height"))
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      return { error: "Missing or invalid image dimensions" }
    }
    const caption = typeof formData.get("caption") === "string" ? String(formData.get("caption")) : ""

    const bytes = new Uint8Array(await file.arrayBuffer())
    const image = await createGalleryImage({
      bytes, contentType: file.type, width, height, fileSize: file.size, caption, albumId, uploadedById: user.id,
    })
    revalidateGallery()
    return { ok: true, image }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteMemberPhotoAction(id: string): Promise<Result> {
  try {
    const user = await requireUser()
    await deleteImageAsMember(z.string().min(1).parse(id), user.id, Boolean(user.isAdmin))
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

const reportSchema = z.object({
  imageId: z.string().min(1),
  reason: z.enum(["inappropriate", "not_mine", "wrong_album", "spam", "other"]),
  details: z.string().max(500).optional(),
})

export async function reportPhotoAction(input: unknown): Promise<Result> {
  try {
    const user = await requireUser()
    await enforceRateLimit({ bucket: "gallery.report", identifier: user.id, limit: 30, windowSec: 3600 })
    const { imageId, reason, details } = reportSchema.parse(input)
    try {
      await prisma.contentReport.create({
        data: { reporterId: user.id, entityType: "gallery_image", entityId: imageId, reason, details: details ?? null },
      })
    } catch {
      // Unique (reporter, entityType, entityId) — already reported by this user. Treat as success.
    }
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
