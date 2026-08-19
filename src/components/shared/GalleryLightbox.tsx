"use client"

import { useCallback, useEffect, useRef } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight, MapPin, Camera, Calendar, User as UserIcon } from "lucide-react"
import type { GalleryImageDTO } from "@/modules/gallery/types"

/**
 * Fullscreen image lightbox. Keyboard (← → Esc), mobile swipe, preloads the
 * neighbours, traps focus, locks body scroll, and exposes ARIA labels + a
 * counter. Navigation stays within the passed `images` array (the current
 * album/view). Rendering is skipped entirely when `index` is null.
 *
 * Right-click / drag are disabled here as a casual-save DETERRENT only — the
 * files live on a public bucket by design; this is not real protection.
 */
export function GalleryLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: GalleryImageDTO[]
  index: number | null
  onClose: () => void
  onIndexChange: (next: number) => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const touchX = useRef<number | null>(null)
  const open = index !== null && index >= 0 && index < images.length

  const go = useCallback(
    (delta: number) => {
      if (index === null) return
      const next = index + delta
      if (next >= 0 && next < images.length) onIndexChange(next)
    },
    [index, images.length, onIndexChange],
  )

  // Keyboard: Esc closes, arrows navigate, Tab is trapped inside the dialog.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose() }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1) }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1) }
      else if (e.key === "Tab") {
        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])")
        if (!nodes || nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        const active = document.activeElement
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, go, onClose])

  // Lock body scroll + focus the close button when opened; restore on close.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [open])

  if (!open || index === null) return null
  const img = images[index]
  const uploaded = new Date(img.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const hasNeighbours = images.length > 1

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={img.caption || "Photo"}
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 text-white/90" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm tabular-nums text-white/70" aria-live="polite">
          {index + 1} / {images.length}
        </span>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Image stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-14" onClick={(e) => e.stopPropagation()}>
        {hasNeighbours && (
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-1 z-10 rounded-full bg-black/40 p-2 text-white/90 hover:bg-black/60 disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:left-3"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <Image
          key={img.id}
          src={img.imageUrl}
          alt={img.caption || "Photo"}
          width={img.width}
          height={img.height}
          sizes="90vw"
          priority
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-h-full w-auto max-w-full select-none object-contain"
        />

        {hasNeighbours && (
          <button
            onClick={() => go(1)}
            disabled={index === images.length - 1}
            aria-label="Next photo"
            className="absolute right-1 z-10 rounded-full bg-black/40 p-2 text-white/90 hover:bg-black/60 disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-3"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Caption + metadata */}
      {(img.caption || img.description || img.location || img.photographer || img.uploaderName) && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2 text-center text-white/90" onClick={(e) => e.stopPropagation()}>
          {img.caption && <p className="text-base font-semibold">{img.caption}</p>}
          {img.description && <p className="mt-1 text-sm text-white/70">{img.description}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/60">
            {img.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {img.location}</span>}
            {img.photographer && <span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> {img.photographer}</span>}
            {img.uploaderName && <span className="inline-flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" /> Added by {img.uploaderName}</span>}
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {uploaded}</span>
          </div>
        </div>
      )}

      {/* Preload neighbours (off-screen) so navigation is instant. */}
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        {[index - 1, index + 1].map((i) =>
          i >= 0 && i < images.length ? (
            <Image key={images[i].id} src={images[i].imageUrl} alt="" width={16} height={16} sizes="16px" />
          ) : null,
        )}
      </div>
    </div>
  )
}
