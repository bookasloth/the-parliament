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
]

// Ad frequency by membership tier:
//   student   — capped feed of 5 items, positions 2 & 5 are ads (3 real posts)
//   associate — an ad after every 5 posts
//   premium   — an ad after every 10 posts
//   life/committee — never any feed ads
export type AdTier = "student" | "associate" | "premium" | "life" | "committee" | string

function everyNFor(tier: AdTier): number | null {
  if (tier === "life" || tier === "committee") return null // no ads
  if (tier === "premium") return 10
  if (tier === "associate") return 5
  return 5 // student handled separately below; default = every 5
}

// Splice ads into a feed page according to the viewer's tier. Returns a new
// array (original untouched).
export function injectFeedAds(
  posts: FeedPost[],
  tier: AdTier,
  ads: FeedPost[] = FEED_ADS,
): FeedPost[] {
  if (ads.length === 0 || posts.length === 0) return posts
  if (tier === "life" || tier === "committee") return posts // ad-free

  // Student: exactly 5 items — post, ad, post, post, ad (3 real posts max).
  if (tier === "student") {
    const real = posts.slice(0, 3)
    const out: FeedPost[] = []
    if (real[0]) out.push(real[0])
    out.push(ads[0 % ads.length])
    if (real[1]) out.push(real[1])
    if (real[2]) out.push(real[2])
    out.push(ads[1 % ads.length])
    return out
  }

  const everyN = everyNFor(tier)!
  const out: FeedPost[] = []
  let adIdx = 0
  for (let i = 0; i < posts.length; i++) {
    out.push(posts[i])
    if ((i + 1) % everyN === 0 && adIdx < ads.length) out.push(ads[adIdx++])
  }
  if (adIdx === 0) out.push(ads[0])
  return out
}
