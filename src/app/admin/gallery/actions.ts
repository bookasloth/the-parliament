"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import { isAllowedImage } from "@/lib/supabase-storage"
import {
  createAlbum, updateAlbum, deleteAlbum, setAlbumPublished, reorderAlbums, setAlbumCover,
  createGalleryImage, updateGalleryImage, deleteGalleryImage, setGalleryPublished,
  reorderGalleryImages, assignImagesToAlbum,
} from "@/modules/gallery/service"
import type { GalleryAlbumDTO, GalleryImageDTO } from "@/modules/gallery/types"

// All actions are admin-gated and return `{ ok: true, ... } | { error: string }`.
// Every mutation resolves (never rejects) so the optimistic client can always
// read a result and roll back on `error`.

type Result<T = unknown> = ({ ok: true } & T) | { error: string }

const MAX_BYTES = 5 * 1024 * 1024

function fail(e: unknown): { error: string } {
  if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Invalid input" }
  if (e instanceof Error) return { error: e.message }
  return { error: "Something went wrong" }
}

function revalidateGallery() {
  revalidatePath("/gallery")
  revalidatePath("/admin/gallery")
}

async function gate(bucket: string) {
  const admin = await requireAdmin()
  await enforceAdminRateLimit(admin.id, bucket, 60, 60)
  return admin
}

// ---- schemas ----
const idSchema = z.string().min(1)
const idList = z.array(idSchema).min(1).max(500)
const albumCreateSchema = z.object({ title: z.string().trim().min(1, "Title is required").max(200), description: z.string().max(2000).optional() })
const albumUpdateSchema = z.object({ title: z.string().trim().min(1).max(200).optional(), description: z.string().max(2000).nullable().optional() })
const imageMetaSchema = z.object({
  caption: z.string().max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  photographer: z.string().max(120).nullable().optional(),
})

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function uploadGalleryImageAction(formData: FormData): Promise<Result<{ image: GalleryImageDTO }>> {
  try {
    await gate("gallery-upload")
    const file = formData.get("file")
    if (!(file instanceof File)) return { error: "No file provided" }
    if (!isAllowedImage(file.type)) return { error: "Unsupported image type (use JPEG, PNG, or WebP)" }
    if (file.size > MAX_BYTES) return { error: "Image exceeds the 5MB limit" }

    // width/height are measured client-side (no server image decoder).
    const width = Number(formData.get("width"))
    const height = Number(formData.get("height"))
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      return { error: "Missing or invalid image dimensions" }
    }
    const albumIdRaw = formData.get("albumId")
    const albumId = typeof albumIdRaw === "string" && albumIdRaw ? albumIdRaw : null
    const caption = typeof formData.get("caption") === "string" ? String(formData.get("caption")) : ""

    const bytes = new Uint8Array(await file.arrayBuffer())
    const image = await createGalleryImage({ bytes, contentType: file.type, width, height, fileSize: file.size, caption, albumId })
    revalidateGallery()
    return { ok: true, image }
  } catch (e) {
    return fail(e)
  }
}

export async function updateGalleryImageAction(id: string, input: unknown): Promise<Result<{ image: GalleryImageDTO }>> {
  try {
    await gate("gallery-edit")
    const parsed = imageMetaSchema.parse(input)
    const image = await updateGalleryImage(idSchema.parse(id), parsed)
    revalidateGallery()
    return { ok: true, image }
  } catch (e) {
    return fail(e)
  }
}

export async function setGalleryPublishedAction(id: string, isPublished: boolean): Promise<Result> {
  try {
    await gate("gallery-edit")
    await setGalleryPublished(idSchema.parse(id), Boolean(isPublished))
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteGalleryImageAction(id: string): Promise<Result> {
  try {
    await gate("gallery-edit")
    await deleteGalleryImage(idSchema.parse(id))
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function reorderGalleryImagesAction(ids: string[]): Promise<Result> {
  try {
    await gate("gallery-reorder")
    await reorderGalleryImages(idList.parse(ids))
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function assignImagesToAlbumAction(imageIds: string[], albumId: string | null): Promise<Result> {
  try {
    await gate("gallery-edit")
    await assignImagesToAlbum(idList.parse(imageIds), albumId ? idSchema.parse(albumId) : null)
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export async function createAlbumAction(input: unknown): Promise<Result<{ album: GalleryAlbumDTO }>> {
  try {
    await gate("gallery-album")
    const album = await createAlbum(albumCreateSchema.parse(input))
    revalidateGallery()
    return { ok: true, album }
  } catch (e) {
    return fail(e)
  }
}

export async function updateAlbumAction(id: string, input: unknown): Promise<Result<{ album: GalleryAlbumDTO }>> {
  try {
    await gate("gallery-album")
    const album = await updateAlbum(idSchema.parse(id), albumUpdateSchema.parse(input))
    revalidateGallery()
    return { ok: true, album }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteAlbumAction(id: string): Promise<Result> {
  try {
    await gate("gallery-album")
    await deleteAlbum(idSchema.parse(id))
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setAlbumPublishedAction(id: string, isPublished: boolean): Promise<Result> {
  try {
    await gate("gallery-album")
    await setAlbumPublished(idSchema.parse(id), Boolean(isPublished))
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function reorderAlbumsAction(ids: string[]): Promise<Result> {
  try {
    await gate("gallery-reorder")
    await reorderAlbums(idList.parse(ids))
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setAlbumCoverAction(albumId: string, imageId: string): Promise<Result> {
  try {
    await gate("gallery-album")
    await setAlbumCover(idSchema.parse(albumId), idSchema.parse(imageId))
    revalidateGallery()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
