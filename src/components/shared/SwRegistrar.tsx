"use client"

import { useEffect } from "react"

// Registers the service worker for EVERY visitor (guests included) so the
// offline/data-saving cache installs site-wide. Push subscription stays in
// PushRegistrar (members only) — this component never prompts for permissions.
export function SwRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Caching is a progressive enhancement — never break the page over it.
    })
  }, [])
  return null
}
