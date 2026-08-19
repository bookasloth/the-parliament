"use client"

import { useState } from "react"
import Image from "next/image"
import type { GalleryImageDTO } from "@/modules/gallery/types"
import { GalleryLightbox } from "./GalleryLightbox"

const SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"

/** One masonry tile. Reserves its aspect ratio (zero layout shift), shows a
 *  pulsing skeleton until the image decodes, then fades it in. */
function Tile({ image, onOpen }: { image: GalleryImageDTO; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={image.caption || "Open photo"}
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
      className="relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-lg bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Image
        src={image.imageUrl}
        alt={image.caption || "Photo"}
        fill
        sizes={SIZES}
        loading="lazy"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onLoad={() => setLoaded(true)}
        className={`select-none object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </button>
  )
}

/**
 * Responsive masonry (2 cols mobile → 5 desktop via CSS columns +
 * break-inside-avoid, preserving each photo's aspect ratio). Progressively
 * reveals in pages ("Load More") and owns the shared lightbox.
 *
 * `onContextMenu`/`select-none` here are casual-save DETERRENTS only — the
 * bucket is public by design; real controls live server-side.
 */
export function GalleryMasonry({ images, pageSize = 24 }: { images: GalleryImageDTO[]; pageSize?: number }) {
  const [visible, setVisible] = useState(pageSize)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const shown = images.slice(0, visible)

  return (
    <>
      <div
        className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5 [&>*]:break-inside-avoid"
        onContextMenu={(e) => e.preventDefault()}
      >
        {shown.map((img, i) => (
          <Tile key={img.id} image={img} onOpen={() => setLightbox(i)} />
        ))}
      </div>

      {visible < images.length && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + pageSize)}
            className="rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
          >
            Load More ({images.length - visible} left)
          </button>
        </div>
      )}

      <GalleryLightbox images={images} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
    </>
  )
}
