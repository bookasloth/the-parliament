import type { FeedPost } from "@/components/shared/FeedCard"

// House ad(s) shown in the feed. Rendered by FeedCard's sponsored branch
// (Sponsored label + tagline + "Get Quote" → sponsorUrl). ponytail: static
// config, not a DB/admin surface — one house ad. Add an Ad model only when ads
// need targeting, scheduling, impression counts, or self-serve buyers.
export const FEED_ADS: FeedPost[] = [
  {
    id: "ad-bookasloth",
    name: "BookASloth",
    headline: "",
    membership: "premium",
    timestamp: "Sponsored",
    isSponsored: true,
    sponsorName: "BookASloth",
    sponsorUrl: "https://bookasloth.com",
    sponsorTagline: "Book experiences without the rush.",
    content: "Plan your next trip the lazy way — handpicked stays, zero hassle.",
    avatar: "https://ui-avatars.com/api/?name=BookASloth&background=009ae4&color=fff",
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
