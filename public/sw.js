/* Service worker for Web Push. Shows a notification on push and focuses/opens
   the target URL on click. Kept dependency-free and tiny. */

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
    // NNAWCA mark on the CDN (same asset as email). /icon-192.png never existed.
    icon: data.icon || "https://website-assets.shubhamdatarkar.in/nnawca/logo-mark.png",
    badge: "https://website-assets.shubhamdatarkar.in/nnawca/logo-mark.png",
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
