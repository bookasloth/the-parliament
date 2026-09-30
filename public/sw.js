/* Service worker: (1) Web Push, (2) offline + data-saving cache.
   Dependency-free and tiny — no Workbox. */

const STATIC_CACHE = "nnawca-static-v1"
const PAGE_CACHE = "nnawca-pages-v1"

// Take over immediately so caching starts on first load, not next visit.
self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older SW versions (bump the *-v1 names to invalidate).
      const keep = [STATIC_CACHE, PAGE_CACHE]
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)
  // Only touch our own origin. Razorpay/Supabase/LiveKit/Sentry pass straight through.
  if (url.origin !== self.location.origin) return
  // Never cache API responses — auth/feed/data must stay fresh and personal.
  if (url.pathname.startsWith("/api/")) return

  // Hashed static assets + images are immutable → cache-first. This is the big
  // mobile data saving: JS/CSS/fonts/images stop re-downloading every visit.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|png|jpe?g|gif|svg|webp|ico)$/.test(url.pathname)
  if (isStatic) {
    event.respondWith(cacheFirst(req, STATIC_CACHE))
    return
  }

  // Page navigations: network-first (fresh when online), cached fallback offline.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, PAGE_CACHE))
  }
})

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res && res.ok) cache.put(req, res.clone())
  return res
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(req)
    if (res && res.ok) cache.put(req, res.clone())
    return res
  } catch {
    // ponytail: offline nav to an uncached page falls back to the last-cached
    // "/" shell; add a dedicated /offline page if a branded screen is wanted.
    const hit = (await cache.match(req)) || (await cache.match("/"))
    return hit || Response.error()
  }
}

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: "NNAWCA", body: event.data ? event.data.text() : "" }
  }
  const title = data.title || "NNAWCA"
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag,
    data: { url: data.url || "/" },
    // Calls should feel urgent: re-alert even if a same-tag one exists.
    renotify: !!data.tag,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // Focus an existing tab and navigate it, else open a new one.
      for (const w of wins) {
        if ("focus" in w) {
          w.focus()
          if ("navigate" in w) w.navigate(url)
          return
        }
      }
      return clients.openWindow(url)
    }),
  )
})
