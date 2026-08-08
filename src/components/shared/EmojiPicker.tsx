"use client"

import { useEffect, useRef, useState } from "react"
import { Smile } from "lucide-react"

const EMOJIS = ["😀", "😂", "❤️", "🔥", "👏", "🎉", "🙏", "💯", "😮", "😢", "👍", "🚀"]

/**
 * Emoji trigger + popup, meant to sit absolutely in the bottom-right of an
 * input. Pass positioning via `className` (e.g. "absolute bottom-2 right-2").
 * The popup opens upward so it never pushes the input's layout.
 */
export default function EmojiPicker({
  onPick,
  className = "",
}: {
  onPick: (emoji: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div className={className} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center rounded-[3px] p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Add emoji"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-30 mb-1 grid w-56 grid-cols-6 gap-1 rounded-[5px] border border-gray-200 bg-white p-2 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              // onMouseDown so it fires before the input blurs.
              onMouseDown={(ev) => {
                ev.preventDefault()
                onPick(e)
              }}
              className="rounded-[3px] p-1 text-lg hover:bg-gray-100"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
