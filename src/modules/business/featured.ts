// Pure, DB-free logic for the paid "Featured" directory slot. No Prisma import so
// it's cheap to unit-test and safe to run on the client (the directory card reads
// isBusinessFeatured to decide whether to show the chip).

/** Length of a Featured term — the ₹2,000/yr slot. */
export const FEATURED_TERM_DAYS = 365

/** End of a Featured term starting now — stored in Business.featuredUntil when an
 *  admin turns a listing's Featured on, so the promotion auto-expires. */
export function featuredTermEnd(now: Date = new Date()): Date {
  return new Date(now.getTime() + FEATURED_TERM_DAYS * 24 * 60 * 60 * 1000)
}

/** Anything with the two fields the featured logic reads. `featuredUntil` may be a
 *  Date (fresh from Prisma) or a string (after unstable_cache serialisation). */
export interface FeaturableBusiness {
  featured: boolean
  featuredUntil: Date | string | null
}

/**
 * A listing counts as featured only while the flag is on AND its paid term hasn't
 * lapsed. A null term means "no expiry" (featured until turned off). Coerces a
 * string featuredUntil so it's safe to call on cached directory rows.
 */
export function isBusinessFeatured(b: FeaturableBusiness, now: Date = new Date()): boolean {
  if (!b.featured) return false
  if (b.featuredUntil == null) return true
  const until = b.featuredUntil instanceof Date ? b.featuredUntil : new Date(b.featuredUntil)
  if (Number.isNaN(until.getTime())) return true // unparseable term → don't silently drop a paid slot
  return until.getTime() > now.getTime()
}

/**
 * Featured-first ordering: effectively-featured listings rise to the top, the rest
 * keep their incoming order. Stable within each group, so a base list already
 * sorted (e.g. by createdAt desc) stays in that order inside each group. Pure —
 * the original array is untouched. Expired-featured rows demote naturally because
 * isBusinessFeatured returns false for them.
 */
export function sortFeaturedFirst<T extends FeaturableBusiness>(businesses: T[], now: Date = new Date()): T[] {
  const featured: T[] = []
  const rest: T[] = []
  for (const b of businesses) {
    if (isBusinessFeatured(b, now)) featured.push(b)
    else rest.push(b)
  }
  return [...featured, ...rest]
}
