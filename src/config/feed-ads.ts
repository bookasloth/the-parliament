import type { FeedPost } from "@/components/shared/FeedCard"

// House ad(s) shown in the feed. Rendered by FeedCard's sponsored branch
// (Sponsored label + tagline + "Get Quote" → sponsorUrl). ponytail: static
// config, not a DB/admin surface — one house ad. Add an Ad model only when ads
// need targeting, scheduling, impression counts, or self-serve buyers.
export const FEED_ADS: FeedPost[] = [
  {
    id: "ad-bookasloth",
    name: "Book A Sloth",
    // Facebook-style link ad: sponsorTagline = normal primary text above the
    // thumbnail; headline + content = the card below it; sponsorCta = button.
    headline: "One booking page for your whole business",
    membership: "premium",
    timestamp: "",
    isSponsored: true,
    sponsorName: "Book A Sloth",
    sponsorSubhead: "Get booked and paid",
    sponsorUrl: "https://www.bookasloth.com",
    sponsorTagline: "Stop chasing appointments. Let clients book you.",
    content:
      "Automate scheduling, payments and reminders — built for coaches, consultants, doctors, trainers and photographers.",
    sponsorCta: "Book A Demo",
    // Book A Sloth's own OG image (1200×630).
    image: "https://company-assets.bookasloth.in/images/seo/home-og-1200x630.jpg",
    avatar: "/bookasloth-icon.png",
    borderType: "darkBlue",
    upvotes: 0,
    downvotes: 0,
    comments: 0,
    shares: 0,
  },
  {
    id: "ad-nnawca-advertise",
    name: "NNAWCA",
    headline: "Advertise to the JNV Nagpur alumni network",
    membership: "premium",
    timestamp: "",
    isSponsored: true,
    sponsorName: "NNAWCA",
    sponsorSubhead: "House ad · advertise with us",
    // Internal advertise/sponsorship page.
    sponsorUrl: "/sponsorship",
    sponsorTagline: "Put your business in front of JNV Nagpur alumni.",
    content:
      "Your ad here, seen across the alumni feed — just ₹3,650 per year, one flat rate. Support NNAWCA and grow your business.",
    sponsorCta: "Advertise Here",
    // Member brand blue for the CTA + verified tick.
    sponsorAccent: "#009ae4",
    // Self-contained SVG banner (shapes/colours, no photo) in /public.
    image: "/nnawca-ad.svg",
    avatar: "/icon-192.png",
    borderType: "darkBlue",
    upvotes: 0,
    downvotes: 0,
    comments: 0,
    shares: 0,
  },
  {
    id: "ad-hostinger",
    name: "Hostinger",
    headline: "Web hosting that just works",
    membership: "premium",
    timestamp: "",
    isSponsored: true,
    sponsorName: "Hostinger",
    sponsorSubhead: "Hosting made easy",
    // Referral backlink (REFERRALCODE=SND1995).
    sponsorUrl: "https://www.hostinger.com/in/pricing?REFERRALCODE=SND1995",
    sponsorTagline: "Launching a site or side project? Get hosting for less.",
    content:
      "Managed hosting with a free domain, SSL and 24/7 support — trusted by millions. Grab the current launch pricing.",
    sponsorCta: "See Pricing",
    // Hostinger brand purple for the CTA + verified tick.
    sponsorAccent: "#673de6",
    // Self-contained SVG banner (shapes/colours, no photo) in /public.
    image: "/hostinger-ad.svg",
    avatar: "/hostinger-icon.png",
    borderType: "darkBlue",
    upvotes: 0,
    downvotes: 0,
    comments: 0,
    shares: 0,
  },
  {
    id: "ad-aisensy",
    name: "AiSensy",
    headline: "WhatsApp marketing on autopilot",
    membership: "premium",
    timestamp: "",
    isSponsored: true,
    sponsorName: "AiSensy",
    sponsorSubhead: "Official WhatsApp Business API",
    // Referral backlink.
    sponsorUrl: "https://wa.aisensy.com/ref/ad4mls",
    sponsorTagline: "Turn WhatsApp into your #1 sales & support channel.",
    content:
      "Broadcasts, drip campaigns and chatbots on the official WhatsApp Business API — trusted by 40,000+ businesses.",
    sponsorCta: "Start Free Trial",
    // WhatsApp green for the CTA + verified tick.
    sponsorAccent: "#25d366",
    // Self-contained SVG banner (shapes/colours, no photo) in /public.
    image: "/aisensy-ad.svg",
    avatar: "/aisensy-icon.png",
    borderType: "darkBlue",
    upvotes: 0,
    downvotes: 0,
    comments: 0,
    shares: 0,
  },
]

// Ad frequency by membership tier:
//   student   — capped feed of 5 items, positions 2 & 5 are ads (3 real posts)
//   committee — never any feed ads (internal office-bearer tier)
//   everyone else — an ad after every 5 posts, cycling ads[] so all recur.
export type AdTier = "student" | "associate" | "premium" | "life" | "committee" | string

// Fixed cadence: one ad after every AD_GAP real posts.
export const AD_GAP = 5

// Rotation position carried across feed pages so load-more keeps the every-5
// cadence + ad order unbroken instead of restarting each page.
export interface FeedAdState {
  sinceAd: number // real posts shown since the last ad (phase within the gap)
  adIdx: number // next index into the rotation (round-robin via % ads.length)
}

/** Weave ads into one page of posts, continuing from `state`. Returns the woven
 *  page + the state for the next page. Pure — original array untouched. */
export function weaveFeedAds(
  posts: FeedPost[],
  state: FeedAdState,
  ads: FeedPost[] = FEED_ADS,
): { posts: FeedPost[]; state: FeedAdState } {
  if (ads.length === 0) return { posts, state }
  const out: FeedPost[] = []
  let { sinceAd, adIdx } = state
  for (const p of posts) {
    out.push(p)
    if (++sinceAd >= AD_GAP) {
      out.push(ads[adIdx++ % ads.length]) // cycle so ads recur
      sinceAd = 0
    }
  }
  return { posts: out, state: { sinceAd, adIdx } }
}

/** Rotation state after a page already woven with `realPosts` real posts — lets
 *  the client resume load-more from the server-rendered first page. */
export function adStateAfter(realPosts: number): FeedAdState {
  return { sinceAd: realPosts % AD_GAP, adIdx: Math.floor(realPosts / AD_GAP) }
}

// Splice ads into a feed page according to the viewer's tier. Returns a new
// array (original untouched).
export function injectFeedAds(
  posts: FeedPost[],
  tier: AdTier,
  ads: FeedPost[] = FEED_ADS,
): FeedPost[] {
  if (ads.length === 0 || posts.length === 0) return posts
  if (tier === "committee") return posts // internal tier: ad-free

  // Student: capped teaser feed — up to 3 real posts, with ads woven in and any
  // remaining ads appended so the full rotation still shows (post, ad, post,
  // post, ad, …leftover ads).
  if (tier === "student") {
    const real = posts.slice(0, 3)
    const out: FeedPost[] = []
    if (real[0]) out.push(real[0])
    if (ads[0]) out.push(ads[0])
    if (real[1]) out.push(real[1])
    if (real[2]) out.push(real[2])
    for (let i = 1; i < ads.length; i++) out.push(ads[i])
    return out
  }

  const { posts: out } = weaveFeedAds(posts, { sinceAd: 0, adIdx: 0 }, ads)
  // Short feed that never reached the first gap still surfaces the rotation.
  if (!out.some((p) => p.isSponsored)) return [...out, ...ads]
  return out
}
