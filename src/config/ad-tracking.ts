// Ad delivery tracking config — the small, static surface the tracking module and
// the beacon endpoint share. Kept separate from feed-ads.ts / ad-sets.ts (the
// creatives) so "how we count" doesn't tangle with "what we show".
//
// Value-first model: every impression slot carries a delivery floor. If a slot
// under-delivers over its term we extend it free (the make-good). That promise is
// only honest if delivery is measured as daily-uniques — see the AdImpression model.

import { FEED_ADS } from "./feed-ads"
import { AD_SETS } from "./ad-sets"

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
  return ids
}

const KNOWN_AD_IDS = knownAdIds()

export function isKnownAdId(id: string): boolean {
  return KNOWN_AD_IDS.has(id)
}
