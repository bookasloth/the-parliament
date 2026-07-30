"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react"

export interface MediaItem {
  url: string
  type: "image" | "video"
}

/**
 * Post media grid + full-screen lightbox. Images open in an overlay with
 * prev/next (arrows or ← → keys); videos play inline in the lightbox.
 * Self-contained, no external deps.
 */
export function MediaGallery({ items }: { items: MediaItem[] }) {
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const n = items.length
  const go = useCallback((d: number) => setIdx((i) => (i + d + n) % n), [n])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, go])

  if (n === 0) return null

  const shown = items.slice(0, 4)
  const extra = n - 4
  const openAt = (i: number) => {
    setIdx(i)
    setOpen(true)
  }

  return (
    <>
      <div className={`mt-3 grid gap-1 overflow-hidden rounded-lg ${n === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {shown.map((m, i) => (
          <button
            key={i}
            type="button"
            onClick={() => openAt(i)}
            className="relative block overflow-hidden bg-gray-100"
            aria-label="Open media"
          >
            {m.type === "video" ? (
              <>
                <video src={m.url} className={`w-full object-cover ${n === 1 ? "max-h-[500px]" : "h-48"}`} muted preload="metadata" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/50 p-2.5">
                    <Play className="h-5 w-5 text-white" fill="white" />
                  </span>
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className={`w-full object-cover ${n === 1 ? "max-h-[500px]" : "h-48"}`} loading="lazy" />
            )}
            {i === 3 && extra > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-semibold text-white">
                +{extra}
              </span>
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {n > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); go(-1) }}
              className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div className="flex max-h-[90vh] max-w-[92vw] items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {items[idx].type === "video" ? (
              <video src={items[idx].url} controls autoPlay className="max-h-[90vh] max-w-[92vw]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={items[idx].url} alt="" className="max-h-[90vh] max-w-[92vw] object-contain" />
            )}
          </div>

          {n > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); go(1) }}
              className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {n > 1 && (
            <span className="absolute bottom-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {idx + 1} / {n}
            </span>
          )}
        </div>
      )}
    </>
  )
}
