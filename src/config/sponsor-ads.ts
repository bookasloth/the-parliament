// The house sponsor for the value-first "always-on" slots — the email footer and
// the pinned Messages/Notifications card. One advertiser fills both:
// Shubham Datarkar (digital marketing + web development). Copy/CTA live here so
// both surfaces + the admin dashboard stay in sync.

export const SHUBHAM_DATARKAR_AD = {
  /** Tracking id — registered in config/ad-tracking.ts (knownAdIds + catalog). */
  id: "ad-shubham-datarkar",
  advertiser: "Shubham Datarkar",
  title: "Shubham Datarkar — Web & Digital Marketing",
  tagline: "Websites that turn visitors into customers — plus SEO & ads to get your business found.",
  cta: "Get a free consultation",
  baseUrl: "https://shubhamdatarkar.com",
} as const

/**
 * Advertiser link carrying campaign UTMs so the sponsor can attribute traffic per
 * placement (email/alerts/…) in their own analytics. This is the sponsor's link,
 * separate from our on-platform delivery tracking (which uses the ad-beacon).
 */
export function sponsorHref(placement: string): string {
  const medium = encodeURIComponent(placement)
  return `${SHUBHAM_DATARKAR_AD.baseUrl}?utm_source=nnawca&utm_medium=${medium}&utm_campaign=alumni_sponsor`
}
