import { describe, it, expect } from "vitest"
import { mapGalleryImage, mapGalleryAlbum } from "@/modules/gallery/mappers"
import { uniqueSlug } from "@/modules/gallery/slug"
import type { DbGalleryAlbum, DbGalleryImage } from "@/modules/gallery/types"

const baseImage: DbGalleryImage = {
  id: "img1", albumId: "alb1", caption: "Founders Day", description: null, location: null,
  photographer: null, imageUrl: "https://x/y.jpg", storagePath: "gallery/2026/08/ab.jpg",
  width: 1600, height: 900, fileSize: BigInt(1048576), mimeType: "image/jpeg",
  isPublished: true, displayOrder: 3,
  createdAt: new Date("2026-08-18T10:00:00.000Z"), updatedAt: new Date("2026-08-19T10:00:00.000Z"),
}

describe("mapGalleryImage", () => {
  it("converts bigint fileSize to a JSON-safe number and dates to ISO", () => {
    const dto = mapGalleryImage(baseImage)
    expect(dto.fileSize).toBe(1048576)
    expect(typeof dto.fileSize).toBe("number")
    expect(dto.createdAt).toBe("2026-08-18T10:00:00.000Z")
    expect(dto.updatedAt).toBe("2026-08-19T10:00:00.000Z")
    // the DTO must be JSON-serializable (a raw bigint would throw here)
    expect(() => JSON.stringify(dto)).not.toThrow()
  })

  it("handles a zero fileSize", () => {
    expect(mapGalleryImage({ ...baseImage, fileSize: BigInt(0) }).fileSize).toBe(0)
  })
})

describe("mapGalleryAlbum", () => {
  const baseAlbum: DbGalleryAlbum = {
    id: "alb1", title: "Reunion 2026", slug: "reunion-2026", description: "Great day",
    coverImageId: "img1", isPublished: true, displayOrder: 0,
    createdAt: new Date("2026-08-18T10:00:00.000Z"), updatedAt: new Date("2026-08-18T10:00:00.000Z"),
  }

  it("resolves cover url + image count from relations", () => {
    const dto = mapGalleryAlbum({ ...baseAlbum, coverImage: { imageUrl: "https://x/c.jpg" }, _count: { images: 7 } })
    expect(dto.coverImageUrl).toBe("https://x/c.jpg")
    expect(dto.imageCount).toBe(7)
  })

  it("defaults cover url to null and count to 0 when relations are absent", () => {
    const dto = mapGalleryAlbum(baseAlbum)
    expect(dto.coverImageUrl).toBeNull()
    expect(dto.imageCount).toBe(0)
  })
})

describe("uniqueSlug", () => {
  it("returns the base slug when free", () => {
    expect(uniqueSlug("Founders Day 2026", new Set())).toBe("founders-day-2026")
  })

  it("appends -2 on first collision, -3 on the next", () => {
    expect(uniqueSlug("Reunion", new Set(["reunion"]))).toBe("reunion-2")
    expect(uniqueSlug("Reunion", new Set(["reunion", "reunion-2"]))).toBe("reunion-3")
  })

  it("strips punctuation and lowercases like the shared slugify", () => {
    expect(uniqueSlug("Holi & Colours!", new Set())).toBe("holi-colours")
  })
})
