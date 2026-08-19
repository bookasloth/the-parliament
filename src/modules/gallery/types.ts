// Domain DTOs for the gallery. Plain, JSON-serializable shapes handed from
// server components/actions to client components — no Prisma types, no BigInt,
// no Date objects cross the boundary (fileSize -> number, timestamps -> ISO).

export interface GalleryImageDTO {
  id: string
  albumId: string | null
  uploadedById: string | null
  caption: string
  description: string | null
  location: string | null
  photographer: string | null
  imageUrl: string
  storagePath: string
  width: number
  height: number
  fileSize: number
  mimeType: string
  isPublished: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
  // Filled by an app-layer join for member views (who contributed the photo).
  uploaderName?: string | null
  uploaderAvatarUrl?: string | null
}

export interface GalleryAlbumDTO {
  id: string
  title: string
  slug: string
  description: string | null
  coverImageId: string | null
  coverImageUrl: string | null
  createdById: string | null
  eventId: string | null
  imageCount: number
  isPublished: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

// ---- Prisma row shapes the mappers accept (structural, so we don't couple to
// generated type import paths). ----

export interface DbGalleryImage {
  id: string
  albumId: string | null
  uploadedById: string | null
  caption: string
  description: string | null
  location: string | null
  photographer: string | null
  imageUrl: string
  storagePath: string
  width: number
  height: number
  fileSize: bigint
  mimeType: string
  isPublished: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface DbGalleryAlbum {
  id: string
  title: string
  slug: string
  description: string | null
  coverImageId: string | null
  createdById: string | null
  eventId: string | null
  isPublished: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
  coverImage?: { imageUrl: string } | null
  _count?: { images: number }
}
