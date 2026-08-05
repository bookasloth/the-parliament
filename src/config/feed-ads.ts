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
    // ponytail: no thumbnail yet — add a real Hostinger banner asset when available.
    avatar: "https://ui-avatars.com/api/?name=Hostinger&background=673de6&color=fff&bold=true",
    borderType: "darkBlue",
    upvotes: 0,
    downvotes: 0,
    comments: 0,
    shares: 0,
  },
]

// Splice ads into a feed page after every `everyN` posts. Returns a new array
// (original untouched). If the page is shorter than `everyN`, still show one ad
// at the end so a sparse feed isn't ad-free.
export function injectFeedAds(
  posts: FeedPost[],
  ads: FeedPost[] = FEED_ADS,
  everyN = 5,
): FeedPost[] {
  if (ads.length === 0 || posts.length === 0) return posts
  const out: FeedPost[] = []
  let adIdx = 0
  for (let i = 0; i < posts.length; i++) {
    out.push(posts[i])
    if ((i + 1) % everyN === 0 && adIdx < ads.length) out.push(ads[adIdx++])
  }
  if (adIdx === 0) out.push(ads[0])
  return out
}
