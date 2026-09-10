// Client-side ad beacon: a tiny fire-and-forget wrapper around the
// recordAdEventsAction server action, plus a hook that fires one impression when
// an ad first becomes visible. Invisible to members — no UI, no blocking.
//
// De-dup happens in three places, deliberately: here (once per ad+placement+kind
// per page load, via `sent`), in tracking.ts (within one batch), and in the DB
// (daily-unique index). This layer just avoids obvious client-side spam.

import { useEffect, useRef } from "react"
import { recordAdEventsAction } from "@/modules/ads/actions"
import type { AdPlacement } from "@/config/ad-tracking"

// Per page-load memory so a card that re-renders doesn't re-fire. Impressions are
// once-only; clicks are allowed through every time (a real repeat click is signal).
const sent = new Set<string>()

function fire(adId: string, placement: AdPlacement, kind: "impression" | "click") {
  if (kind === "impression") {
    const key = `${placement}:${adId}`
    if (sent.has(key)) return
    sent.add(key)
  }
  // Fire-and-forget; telemetry must never throw into the render path.
  void recordAdEventsAction([{ adId, placement, kind }]).catch(() => {})
}

/** Record a click on an ad (call from the anchor's onClick). */
export function trackAdClick(adId: string, placement: AdPlacement) {
  fire(adId, placement, "click")
}

/**
 * Attach the returned ref to an ad element; it fires exactly one impression when
 * the element is ≥50% visible (or immediately if IntersectionObserver is absent,
 * e.g. SSR/old browsers). Counting on visibility — not mount — keeps below-the-fold
 * feed ads from counting as delivered before anyone scrolls to them.
 */
export function useAdImpression<T extends HTMLElement = HTMLElement>(
  adId: string,
  placement: AdPlacement,
) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      fire(adId, placement, "impression")
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            fire(adId, placement, "impression")
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [adId, placement])
  return ref
}
