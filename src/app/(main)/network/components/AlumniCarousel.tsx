"use client"

import { useRef, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface AlumniCarouselProps {
  title: string
  subtitle?: string
  /** Width of each item track cell; cards size to fill. */
  itemClassName?: string
  children: ReactNode
}

/**
 * Generic horizontal carousel: scroll-snap track on mobile (swipeable),
 * arrow controls on desktop. Used for People You May Know, Events, Chapters.
 */
export function AlumniCarousel({ title, subtitle, itemClassName = "w-[260px]", children }: AlumniCarouselProps) {
  const track = useRef<HTMLDivElement>(null)

  const scroll = (dir: -1 | 1) => {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" })
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="hidden gap-1.5 sm:flex">
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-brand hover:text-brand"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-brand hover:text-brand"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={track}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-1 scrollbar-none [&>*]:snap-start [&>*]:flex-shrink-0"
      >
        {/* Each direct child is a fixed-width snap cell. */}
        {Array.isArray(children)
          ? children.map((c, i) => (
              <div key={i} className={itemClassName}>{c}</div>
            ))
          : <div className={itemClassName}>{children}</div>}
      </div>
    </section>
  )
}
