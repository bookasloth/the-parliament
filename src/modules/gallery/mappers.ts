import type {
  DbGalleryAlbum, DbGalleryImage, GalleryAlbumDTO, GalleryImageDTO,
} from "./types"

// DB row -> domain DTO. Non-trivial on purpose: fileSize is a Postgres bigint
// (JS bigint, not JSON-serializable) and must become a number; timestamps
// become ISO strings so the object can cross the server/client boundary.

export function mapGalleryImage(
  row: DbGalleryImage,
  uploader?: { name: string | null; avatarUrl: string | null } | null,
): GalleryImageDTO {
  return {
    id: row.id,
    albumId: row.albumId,
    uploadedById: row.uploadedById,
    caption: row.caption,
    description: row.description,
    location: row.location,
    photographer: row.photographer,
    imageUrl: row.imageUrl,
    storagePath: row.storagePath,
    width: row.width,
    height: row.height,
    fileSize: Number(row.fileSize),
    mimeType: row.mimeType,
    isPublished: row.isPublished,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    uploaderName: uploader?.name ?? null,
    uploaderAvatarUrl: uploader?.avatarUrl ?? null,
  }
}

/** Who may delete a photo: the member who uploaded it, or any admin. Pure so
 *  it's unit-testable and reused by both the action and the UI. */
export function canDeleteImage(
  image: { uploadedById: string | null },
  userId: string,
  isAdmin: boolean,
): boolean {
  return isAdmin || (image.uploadedById !== null && image.uploadedById === userId)
}

export function mapGalleryAlbum(row: DbGalleryAlbum): GalleryAlbumDTO {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverImageId: row.coverImageId,
    coverImageUrl: row.coverImage?.imageUrl ?? null,
    createdById: row.createdById,
    eventId: row.eventId,
    imageCount: row._count?.images ?? 0,
    isPublished: row.isPublished,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
