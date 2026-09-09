// House display ads for the right-hand sidebar rail.
//
// A "set" is one offer (SEO/AI audit, website audit, content audit) with five
// colourway variants. A page picks a set; the rail rotates through that set's
// variants hourly. Sets are assigned per page group so a member moving between
// sections sees a different offer rather than the same creative everywhere:
//
//   seoAi   → /feed, /feed/[postId]
//   website → /badges, /badges/[slug], /community, /events, /groups
//   content → /gallery, /gallery/[slug], /store, /connections, /leaderboard, /network
//
// ponytail: static config, not a DB/admin surface. These are house ads for one
// advertiser. Add an Ad model only when ads need targeting, scheduling,
// impression counts, or self-serve buyers.
const CDN = "https://website-assets.shubhamdatarkar.com/nnawca/ad"

export interface AdCreative {
  src: string
  alt: string
}

export interface AdSet {
  creatives: AdCreative[]
  href: string
  /** Intrinsic size of the artwork — drives next/image's aspect ratio. */
  width: number
  height: number
}

export type AdSetKey = "seoAi" | "website" | "content" | "timewheel"

// Colourways exported for every audit creative, in rotation order.
const COLORS = ["blue", "green", "orange", "pink", "yellow"] as const

/** Build a 5-colour audit set from its export slug (e.g. "1-seo-ai"). */
function auditSet(slug: string, alt: string, href: string): AdSet {
  return {
    creatives: COLORS.map((color) => ({ src: `${CDN}/${color}-${slug}.png`, alt })),
    href,
    width: 1080,
    height: 1920,
  }
}

// Each set lands on the page that matches its offer, so the creative's CTA and
// the destination agree ("Run My Free Audit" → the audit tool, not a contact form).
export const AD_SETS: Record<AdSetKey, AdSet> = {
  seoAi: auditSet(
    "1-seo-ai",
    "Free AI search audit — see whether ChatGPT names your brand or your competitors",
    "https://shubhamdatarkar.com/tools/seo-audit",
  ),
  website: auditSet(
    "2-website",
    "Free website conversion audit — turn your site from a bill into an asset",
    "https://shubhamdatarkar.com/web-developer-nagpur",
  ),
  content: auditSet(
    "3-content",
    "Free content audit — one idea into thirty days of content",
    "https://shubhamdatarkar.com/seo-expert-india/nagpur",
  ),
  // The original Timewheel rail art. Kept as live inventory but not mapped to
  // any page right now — point a page's AdRail at "timewheel" to bring it back.
  timewheel: {
    creatives: [
      { src: `${CDN}/timewheel-3b-websites.png`, alt: "Timewheel Internet — We build websites" },
      { src: `${CDN}/timewheel-3c-stores.png`, alt: "Timewheel Internet — We build online stores" },
      { src: `${CDN}/timewheel-3d-booking.png`, alt: "Timewheel Internet — We build booking software" },
      { src: `${CDN}/timewheel-3e-alumni.png`, alt: "Timewheel Internet — We build alumni networks" },
      { src: `${CDN}/timewheel-3a-saas.png`, alt: "Timewheel Internet — We build SaaS" },
    ],
    href: "https://shubhamdatarkar.com/contact",
    width: 680,
    height: 1000,
  },
}

export const ROTATION_MS = 60 * 60 * 1000 // 1 hour

// Per-set phase offset so two sets never land on the same colourway in the same
// hour — a member crossing /feed → /groups sees two different colours.
const SET_OFFSET: Record<AdSetKey, number> = {
  seoAi: 0,
  website: 1,
  content: 2,
  timewheel: 3,
}

/**
 * Index of the creative a set shows at `now`. Pure + time-derived (no
 * Math.random) so the server render and the first client render agree — a
 * random pick would hydration-mismatch.
 */
export function adIndex(set: AdSetKey, now: number = Date.now()): number {
  const { creatives } = AD_SETS[set]
  const hour = Math.floor(now / ROTATION_MS)
  const n = creatives.length
  // Euclidean modulo: a plain `%` returns a NEGATIVE index for a pre-epoch
  // timestamp, and creatives[-1] is undefined — which crashes the render.
  return (((hour + SET_OFFSET[set]) % n) + n) % n
}

/**
 * Whether a viewer sees the sidebar display ad. Premium and committee are
 * ad-free; life members keep the sidebar ad (only in-feed ads are switched off
 * for them, per the membership ladder in `feed-ads.ts`).
 *
 * Single source of truth — /feed and /badges/[slug] previously computed this
 * two different ways that happened to agree.
 */
export function showSidebarAd(tier: string | null | undefined): boolean {
  return tier !== "premium" && tier !== "committee"
}
