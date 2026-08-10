"use client"

import { useState } from "react"
import { Play } from "lucide-react"

/** mm:ss (or h:mm:ss) from a duration in seconds. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return ""
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m)
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * A video's first frame as a thumbnail, with a centered play glyph and a
 * duration badge (read from metadata) — so a video attachment reads as a video,
 * not a still. Used in the composer preview grid and the feed media grid.
 */
export function VideoThumb({ src, className = "" }: { src: string; className?: string }) {
  const [duration, setDuration] = useState<number | null>(null)
  return (
    <>
      <video
        src={src}
        className={className}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="rounded-[4px] bg-black/50 p-2">
          <Play className="h-5 w-5 text-white" fill="white" />
        </span>
      </span>
      {duration != null && duration > 0 && (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded-[3px] bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatDuration(duration)}
        </span>
      )}
    </>
  )
}
