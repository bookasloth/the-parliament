"use client"

import { useEffect } from "react"

// Registers the service worker and subscribes the browser to Web Push, then
// stores the subscription server-side. Renders nothing. Mounted once in the
// gated layout so every logged-in page keeps the subscription fresh.

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  // Explicit ArrayBuffer (not ArrayBufferLike) so it satisfies BufferSource.
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function PushRegistrar() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!key) return
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return

    let cancelled = false

    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js")

        // Ask once. If previously denied, respect it (don't nag).
        let perm = Notification.permission
        if (perm === "default") perm = await Notification.requestPermission()
        if (perm !== "granted" || cancelled) return

        const existing = await reg.pushManager.getSubscription()
        const sub =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
          }))
        if (cancelled) return

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(sub),
        })
      } catch (e) {
        // Push is a progressive enhancement — never break the page over it.
        console.warn("Push registration failed:", e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
