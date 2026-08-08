"use client"

import { useState } from "react"
import { X, ChevronLeft, ChevronRight, Calendar } from "lucide-react"

export interface GalleryPhoto {
  src: string
  title: string
  event: string
  year: string
  category: string
}

const CATEGORIES = ["All", "Reunions", "Meetups", "Community", "Celebrations"] as const

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [filter, setFilter] = useState<string>("All")
  const [open, setOpen] = useState<number | null>(null)

  const shown = filter === "All" ? photos : photos.filter((p) => p.category === filter)
  const active = open !== null ? shown[open] : null

  function move(dir: number) {
    setOpen((i) => (i === null ? i : (i + dir + shown.length) % shown.length))
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-10 flex flex-wrap justify-center gap-2.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => { setFilter(c); setOpen(null) }}
            className={`rounded-[3px] px-4 py-2 text-sm font-semibold transition ${
              filter === c ? "bg-brand text-white" : "border border-black/10 bg-white text-[#5b5b5b] hover:border-black/20"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Masonry */}
      <div className="[column-fill:_balance] columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((p, i) => (
          <button
            key={p.src}
            onClick={() => setOpen(i)}
            className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-[5px] border border-black/5 bg-gray-100 text-left"
          >
            <div className="relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.title} loading="lazy" className="w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <p className="text-sm font-semibold text-white">{p.title}</p>
                <p className="text-xs text-white/70">{p.event} · {p.year}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="text-center text-[#8a8a8a]">No photos in this category yet.</p>}

      {/* Lightbox */}
      {active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={() => setOpen(null)}>
          <button className="absolute right-5 top-5 text-white/80 hover:text-white" aria-label="Close" onClick={() => setOpen(null)}>
            <X className="h-7 w-7" />
          </button>
          <button className="absolute left-3 top-1/2 -translate-y-1/2 rounded-[3px] bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Previous" onClick={(e) => { e.stopPropagation(); move(-1) }}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="max-h-[85vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.src} alt={active.title} className="max-h-[75vh] w-auto rounded-[5px] object-contain" />
            <div className="mt-3 text-center">
              <p className="font-heading text-lg font-semibold text-white">{active.title}</p>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-white/60">
                <Calendar className="h-3.5 w-3.5" /> {active.event} · {active.year}
              </p>
            </div>
          </div>
          <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[3px] bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Next" onClick={(e) => { e.stopPropagation(); move(1) }}>
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  )
}
