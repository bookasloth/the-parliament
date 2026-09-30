"use client"

import { useEffect } from "react"

// Overrides the PWA/browser status-bar colour (the <meta name="theme-color">)
// at runtime so a logged-in member's mobile status bar shows their house colour
// instead of the flat brand blue. No-ops server-side; harmless on desktop.
export function StatusBarColor({ color }: { color: string }) {
  useEffect(() => {
    if (!color) return
    const metas = document.querySelectorAll('meta[name="theme-color"]')
    if (metas.length) {
      metas.forEach((m) => m.setAttribute("content", color))
    } else {
      const m = document.createElement("meta")
      m.setAttribute("name", "theme-color")
      m.setAttribute("content", color)
      document.head.appendChild(m)
    }
  }, [color])
  return null
}
