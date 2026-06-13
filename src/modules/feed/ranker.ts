export interface RankableSignals {
  upvoteCount: number
  downvoteCount: number
  commentCount: number
  shareCount: number
  qualityScore: number
  reportPenalty: number
  ageHours: number
  isPinned: boolean
}

export interface Ranker {
  name: string
  score(signals: RankableSignals): number
}

export const recencyRanker: Ranker = {
  name: "recency",
  score: (s) => (s.isPinned ? 1e6 : 0) - s.ageHours,
}

export const engagementRanker: Ranker = {
  name: "engagement",
  score: (s) => {
    if (s.isPinned) return 1e6
    const net = s.upvoteCount - s.downvoteCount + s.commentCount * 1.5 + s.shareCount * 2
    const decay = Math.pow(s.ageHours + 2, 1.6)
    return (net + s.qualityScore - s.reportPenalty) / decay
  },
}

const REGISTRY: Record<string, Ranker> = {
  recency: recencyRanker,
  engagement: engagementRanker,
}

export function getRanker(name = "engagement"): Ranker {
  return REGISTRY[name] ?? engagementRanker
}
