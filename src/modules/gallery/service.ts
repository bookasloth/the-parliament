import { prisma } from "@/lib/prisma"
import { uploadGalleryImage, deleteStorageObject } from "@/lib/supabase-storage"
import { mapGalleryAlbum, mapGalleryImage } from "./mappers"
import { uniqueSlug } from "./slug"
import type { GalleryAlbumDTO, GalleryImageDTO } from "./types"

// All gallery data access + mutation. Reads come in two flavours: public
// (published-only, fail-soft — never throw, so a public page still prerenders
// if the migration hasn't run) and admin (everything). Writes are called only
// from admin-gated server actions.

const albumWithMeta = {
  include: { coverImage: { select: { imageUrl: true } }, _count: { select: { images: true } } },
} as const

// ---- text hygiene ----
const cap = (s: string | null | undefined, n: number) => (s ?? "").trim().slice(0, n)
const CAPS = { caption: 200, description: 2000, location: 120, photographer: 120, title: 200 }

// ---------------------------------------------------------------------------
// Public reads (fail-soft: log + return empty; deploy order is not load-bearing)
// ---------------------------------------------------------------------------

export async function getPublishedAlbums(): Promise<GalleryAlbumDTO[]> {
  try {
    const rows = await prisma.galleryAlbum.findMany({
      where: { isPublished: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      ...albumWithMeta,
    })
    return rows.map(mapGalleryAlbum)
  } catch (e) {
    console.error("[gallery] getPublishedAlbums failed", e)
    return []
  }
}

export async function getPublishedGalleryImages(opts: { albumId?: string } = {}): Promise<GalleryImageDTO[]> {
  try {
    const rows = await prisma.galleryImage.findMany({
      where: { isPublished: true, ...(opts.albumId ? { albumId: opts.albumId } : {}) },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    })
    return rows.map((r) => mapGalleryImage(r))
  } catch (e) {
    console.error("[gallery] getPublishedGalleryImages failed", e)
    return []
  }
}

/** Published album by slug + its published images. Null if missing/hidden or on error. */
export async function getPublishedAlbumBySlug(
  slug: string,
): Promise<{ album: GalleryAlbumDTO; images: GalleryImageDTO[] } | null> {
  try {
    const album = await prisma.galleryAlbum.findFirst({ where: { slug, isPublished: true }, ...albumWithMeta })
    if (!album) return null
    const images = await getPublishedGalleryImages({ albumId: album.id })
    return { album: mapGalleryAlbum(album), images }
  } catch (e) {
    console.error("[gallery] getPublishedAlbumBySlug failed", e)
    return null
  }
}

// ---------------------------------------------------------------------------
// Admin reads (include hidden). These may throw — admin pages want the error.
// ---------------------------------------------------------------------------

export async function listAlbumsAdmin(): Promise<GalleryAlbumDTO[]> {
  const rows = await prisma.galleryAlbum.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    ...albumWithMeta,
  })
  return rows.map(mapGalleryAlbum)
}

export async function listImagesAdmin(opts: { albumId?: string | null } = {}): Promise<GalleryImageDTO[]> {
  const rows = await prisma.galleryImage.findMany({
    where: opts.albumId === undefined ? {} : { albumId: opts.albumId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  })
  return rows.map((r) => mapGalleryImage(r))
}

// ---------------------------------------------------------------------------
// Album mutations
// ---------------------------------------------------------------------------

async function existingSlugs(): Promise<Set<string>> {
  const rows = await prisma.galleryAlbum.findMany({ select: { slug: true } })
  return new Set(rows.map((r) => r.slug))
}

export async function createAlbum(input: { title: string; description?: string }): Promise<GalleryAlbumDTO> {
  const title = cap(input.title, CAPS.title)
  if (!title) throw new Error("Album title is required")
  const slug = uniqueSlug(title, await existingSlugs())
  const max = await prisma.galleryAlbum.aggregate({ _max: { displayOrder: true } })
  const row = await prisma.galleryAlbum.create({
    data: {
      title,
      slug,
      description: input.description ? cap(input.description, CAPS.description) : null,
      displayOrder: (max._max.displayOrder ?? -1) + 1,
    },
    ...albumWithMeta,
  })
  return mapGalleryAlbum(row)
}

/** Edit title/description. Slug is intentionally NOT regenerated — album URLs
 *  stay stable once published. */
export async function updateAlbum(id: string, input: { title?: string; description?: string | null }): Promise<GalleryAlbumDTO> {
  const data: { title?: string; description?: string | null } = {}
  if (input.title !== undefined) {
    const t = cap(input.title, CAPS.title)
    if (!t) throw new Error("Album title is required")
    data.title = t
  }
  if (input.description !== undefined) data.description = input.description ? cap(input.description, CAPS.description) : null
  const row = await prisma.galleryAlbum.update({ where: { id }, data, ...albumWithMeta })
  return mapGalleryAlbum(row)
}

/** Delete an album. Its images are left unfiled (FK SetNull) — never cascades. */
export async function deleteAlbum(id: string): Promise<void> {
  await prisma.galleryAlbum.delete({ where: { id } })
}

export async function setAlbumPublished(id: string, isPublished: boolean): Promise<void> {
  await prisma.galleryAlbum.update({ where: { id }, data: { isPublished } })
}

export async function reorderAlbums(ids: string[]): Promise<void> {
  await prisma.$transaction(ids.map((id, i) => prisma.galleryAlbum.update({ where: { id }, data: { displayOrder: i } })))
}

export async function setAlbumCover(albumId: string, imageId: string): Promise<void> {
  const img = await prisma.galleryImage.findUnique({ where: { id: imageId }, select: { id: true } })
  if (!img) throw new Error("Image not found")
  await prisma.galleryAlbum.update({ where: { id: albumId }, data: { coverImageId: imageId } })
}

// ---------------------------------------------------------------------------
// Image mutations
// ---------------------------------------------------------------------------

/** Upload one photo then insert its row. If the insert fails, the just-uploaded
 *  object is removed so storage never orphans. New images sort last. */
export async function createGalleryImage(input: {
  bytes: Uint8Array
  contentType: string
  width: number
  height: number
  fileSize: number
  caption?: string
  albumId?: string | null
  uploadedById?: string | null
}): Promise<GalleryImageDTO> {
  const albumId = input.albumId ?? null
  const max = await prisma.galleryImage.aggregate({ _max: { displayOrder: true }, where: { albumId } })
  const { url, path } = await uploadGalleryImage(input.bytes, input.contentType)
  try {
    const row = await prisma.galleryImage.create({
      data: {
        albumId,
        uploadedById: input.uploadedById ?? null,
        caption: cap(input.caption, CAPS.caption),
        imageUrl: url,
        storagePath: path,
        width: input.width,
        height: input.height,
        fileSize: BigInt(Math.max(0, Math.trunc(input.fileSize))),
        mimeType: input.contentType,
        displayOrder: (max._max.displayOrder ?? -1) + 1,
      },
    })
    return mapGalleryImage(row)
  } catch (e) {
    // Row insert failed — don't leave the uploaded object orphaned.
    await deleteStorageObject(path).catch(() => {})
    throw e
  }
}

export async function updateGalleryImage(
  id: string,
  input: { caption?: string; description?: string | null; location?: string | null; photographer?: string | null },
): Promise<GalleryImageDTO> {
  const data: Record<string, string | null> = {}
  if (input.caption !== undefined) data.caption = cap(input.caption, CAPS.caption)
  if (input.description !== undefined) data.description = input.description ? cap(input.description, CAPS.description) : null
  if (input.location !== undefined) data.location = input.location ? cap(input.location, CAPS.location) : null
  if (input.photographer !== undefined) data.photographer = input.photographer ? cap(input.photographer, CAPS.photographer) : null
  const row = await prisma.galleryImage.update({ where: { id }, data })
  return mapGalleryImage(row)
}

export async function setGalleryPublished(id: string, isPublished: boolean): Promise<void> {
  await prisma.galleryImage.update({ where: { id }, data: { isPublished } })
}

/** Delete the row first, then best-effort remove the object (non-fatal). */
export async function deleteGalleryImage(id: string): Promise<void> {
  const row = await prisma.galleryImage.findUnique({ where: { id }, select: { storagePath: true } })
  await prisma.galleryImage.delete({ where: { id } })
  if (row?.storagePath) await deleteStorageObject(row.storagePath).catch((e) => console.error("[gallery] object cleanup failed", e))
}

export async function reorderGalleryImages(ids: string[]): Promise<void> {
  await prisma.$transaction(ids.map((id, i) => prisma.galleryImage.update({ where: { id }, data: { displayOrder: i } })))
}

export async function assignImagesToAlbum(imageIds: string[], albumId: string | null): Promise<void> {
  if (albumId) {
    const album = await prisma.galleryAlbum.findUnique({ where: { id: albumId }, select: { id: true } })
    if (!album) throw new Error("Album not found")
  }
  await prisma.galleryImage.updateMany({ where: { id: { in: imageIds } }, data: { albumId } })
}

// ---------------------------------------------------------------------------
// Member (collaborative) surface. Any verified member may create albums and
// contribute photos; viewing is members-only (gated at the page). Uploads are
// still server-mediated (service-role write) — the browser never touches the
// bucket. Photos publish instantly; moderation is report + owner/admin delete.
// ---------------------------------------------------------------------------

/** Throw unless the user exists and is verified. Gate for every member write. */
export async function assertVerifiedMember(userId: string): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } })
  if (!u) throw new Error("Account not found")
  if (!u.isVerified) throw new Error("Only verified members can contribute to the gallery")
}

export async function createMemberAlbum(input: {
  title: string
  description?: string
  createdById: string
  eventId?: string | null
}): Promise<GalleryAlbumDTO> {
  const title = cap(input.title, CAPS.title)
  if (!title) throw new Error("Album title is required")
  if (input.eventId) {
    const ev = await prisma.event.findUnique({ where: { id: input.eventId }, select: { id: true } })
    if (!ev) throw new Error("Event not found")
    const existing = await prisma.galleryAlbum.findUnique({ where: { eventId: input.eventId }, ...albumWithMeta })
    if (existing) return mapGalleryAlbum(existing) // one album per event — return the existing one
  }
  const slug = uniqueSlug(title, await existingSlugs())
  const max = await prisma.galleryAlbum.aggregate({ _max: { displayOrder: true } })
  const row = await prisma.galleryAlbum.create({
    data: {
      title,
      slug,
      description: input.description ? cap(input.description, CAPS.description) : null,
      createdById: input.createdById,
      eventId: input.eventId ?? null,
      displayOrder: (max._max.displayOrder ?? -1) + 1,
    },
    ...albumWithMeta,
  })
  return mapGalleryAlbum(row)
}

/** The shared album for an event, created on first use. */
export async function getOrCreateEventAlbum(eventId: string, title: string, createdById: string): Promise<GalleryAlbumDTO> {
  const existing = await prisma.galleryAlbum.findUnique({ where: { eventId }, ...albumWithMeta })
  if (existing) return mapGalleryAlbum(existing)
  return createMemberAlbum({ title, createdById, eventId })
}

/** Attach uploader name + avatar to a set of images (one query, app-layer join). */
export async function enrichUploaders(images: GalleryImageDTO[]): Promise<GalleryImageDTO[]> {
  const ids = [...new Set(images.map((i) => i.uploadedById).filter((x): x is string => !!x))]
  if (ids.length === 0) return images
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, displayName: true, legalName: true, profile: { select: { photoUrl: true } } },
  })
  const byId = new Map(users.map((u) => [u.id, { name: u.displayName || u.legalName, avatarUrl: u.profile?.photoUrl ?? null }]))
  return images.map((i) => {
    const u = i.uploadedById ? byId.get(i.uploadedById) : null
    return u ? { ...i, uploaderName: u.name, uploaderAvatarUrl: u.avatarUrl } : i
  })
}

/** Published album by slug + its published images, each with uploader info. */
export async function getMemberAlbumBySlug(
  slug: string,
): Promise<{ album: GalleryAlbumDTO; images: GalleryImageDTO[] } | null> {
  const base = await getPublishedAlbumBySlug(slug)
  if (!base) return null
  return { album: base.album, images: await enrichUploaders(base.images) }
}

/** Delete a photo as a member: allowed for the uploader or an admin. */
export async function deleteImageAsMember(id: string, userId: string, isAdmin: boolean): Promise<void> {
  const row = await prisma.galleryImage.findUnique({ where: { id }, select: { uploadedById: true } })
  if (!row) return
  if (!isAdmin && row.uploadedById !== userId) throw new Error("You can only remove photos you added")
  await deleteGalleryImage(id)
}
