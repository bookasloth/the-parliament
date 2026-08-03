"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

// Single-open FAQ accordion: opening one collapses the rest. Smooth grid-based
// height animation; the + icon rotates to × when open.
export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="mx-auto mt-12 max-w-3xl divide-y divide-black/10">
      {items.map((f, i) => {
        const isOpen = open === i
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-heading text-lg font-medium text-[#1a1a1a]">{f.q}</span>
              <Plus
                className={`h-5 w-5 shrink-0 text-[#a3a3a3] transition-transform duration-300 ${isOpen ? "rotate-45 text-brand" : ""}`}
              />
            </button>
            <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <p className="pb-5 text-[15px] leading-relaxed text-[#5b5b5b]">{f.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
