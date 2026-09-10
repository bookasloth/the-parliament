// Ad delivery tracking config — the small, static surface the tracking module and
// the beacon endpoint share. Kept separate from feed-ads.ts / ad-sets.ts (the
// creatives) so "how we count" doesn't tangle with "what we show".
//
// Value-first model: every impression slot carries a delivery floor. If a slot
// under-delivers over its term we extend it free (the make-good). That promise is
// only honest if delivery is measured as daily-uniques — see the AdImpression model.

import { FEED_ADS } from "./feed-ads"
import { AD_SETS } from "./ad-sets"
import { SHUBHAM_DATARKAR_AD, sponsorHref } from "./sponsor-ads"

/** Sellable placements. `feed` + `sidebar` render today; `email`/`alerts`/
 *  `directory` are the value-first build-outs and are accepted up-front so their
 *  beacons validate the day they ship. */
export const AD_PLACEMENTS = ["feed", "sidebar", "email", "alerts", "directory"] as const
export type AdPlacement = (typeof AD_PLACEMENTS)[number]

export const AD_EVENT_KINDS = ["impression", "click"] as const
export type AdEventKind = (typeof AD_EVENT_KINDS)[number]

/** The guarantee: minimum verified daily-unique impressions per slot per year, or
 *  we extend the term free. Floors are set conservatively below expected delivery
 *  so a make-good is the exception, not the rule. */
export const AD_DELIVERY_FLOOR_PER_YEAR = 10_000

/** Known creative / ad-set ids. The beacon endpoint is effectively public (any
 *  signed-in member can POST to it), so a forged `adId` must not be able to spam
 *  the table — we accept only ids that map to a real creative. `feed` ads are keyed
 *  by FEED_ADS[].id ("ad-bookasloth", …); `sidebar` by AdSetKey ("seoAi", …). As
 *  new placements gain real creatives, register their ids here. */
export function knownAdIds(): Set<string> {
  const ids = new Set<string>()
  for (const ad of FEED_ADS) ids.add(ad.id)
  for (const key of Object.keys(AD_SETS)) ids.add(key)
  ids.add(SHUBHAM_DATARKAR_AD.id) // house sponsor for the email + alerts slots
  return ids
}

const KNOWN_AD_IDS = knownAdIds()

export function isKnownAdId(id: string): boolean {
  return KNOWN_AD_IDS.has(id)
}

// ── Catalog: adId → human label, for the admin delivery dashboard ─────────────

/** Friendly names for the sidebar ad-sets (whose keys are terse). */
const SIDEBAR_SET_LABELS: Record<string, string> = {
  seoAi: "SEO / AI Audit",
  website: "Website Audit",
  content: "Content Audit",
  timewheel: "Timewheel Internet",
}

export interface AdCatalogEntry {
  adId: string
  placement: AdPlacement
  name: string
  href: string
}

/** Every live (adId, placement) with a readable advertiser name + destination.
 *  The admin dashboard joins delivery counts against this so a slot with zero
 *  impressions still shows up as a row (delivered nothing yet, not missing). */
export function adCatalog(): AdCatalogEntry[] {
  const feed: AdCatalogEntry[] = FEED_ADS.map((a) => ({
    adId: a.id,
    placement: "feed",
    name: a.sponsorName ?? a.name ?? a.id,
    href: a.sponsorUrl ?? "",
  }))
  const sidebar: AdCatalogEntry[] = Object.keys(AD_SETS).map((key) => ({
    adId: key,
    placement: "sidebar",
    name: SIDEBAR_SET_LABELS[key] ?? key,
    href: AD_SETS[key as keyof typeof AD_SETS].href,
  }))
  // House sponsor (Shubham Datarkar) fills the email footer + the pinned Alerts card.
  const sponsor: AdCatalogEntry[] = (["email", "alerts"] as const).map((placement) => ({
    adId: SHUBHAM_DATARKAR_AD.id,
    placement,
    name: SHUBHAM_DATARKAR_AD.advertiser,
    href: sponsorHref(placement),
  }))
  return [...feed, ...sidebar, ...sponsor]
}
