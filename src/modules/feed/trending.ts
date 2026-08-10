// "Trending" = the ranked hot-score feed, but windowed to recent posts so it's
// genuinely "what's hot now" rather than an all-time leaderboard.

export const TRENDING_WINDOW_HOURS = 48

/** Oldest createdAt a post may have to count as trending. */
export function trendingWindowStart(now: Date = new Date(), hours = TRENDING_WINDOW_HOURS): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000)
}
