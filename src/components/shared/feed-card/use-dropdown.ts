"use client"

import { useState, useEffect, useRef } from "react"

// Shared click-outside dropdown state, used by the share menu and the overflow menu.
export function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return { open, setOpen, ref }
}
