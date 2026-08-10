// PWA install helpers. Pure so the platform branch can be unit-tested without a DOM.

export type Platform = "ios" | "android-chromium" | "desktop-chromium" | "other"

/**
 * Decide which install UX to show. `hasPrompt` is whether the browser fired a
 * `beforeinstallprompt` event (Chromium only — one-tap install available).
 */
export function detectPlatform(ua: string, hasPrompt: boolean): Platform {
  const s = ua.toLowerCase()
  // iPadOS 13+ reports as desktop Safari; the touch check catches it upstream,
  // but the classic tokens cover phones/older iPads.
  const isIOS = /iphone|ipad|ipod/.test(s) || (/macintosh/.test(s) && /mobile/.test(s))
  if (isIOS) return "ios"
  if (hasPrompt) {
    // Coarse pointer ⇒ phone/tablet. We can't read pointer here (pure fn), so
    // fall back to UA mobile token; caller may refine.
    return /android|mobile/.test(s) ? "android-chromium" : "desktop-chromium"
  }
  return "other"
}
