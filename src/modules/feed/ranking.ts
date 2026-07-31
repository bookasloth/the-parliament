// Storable "hot" score for feed ranking (Reddit-style: recency + engagement,
// monotonic, computed at write time so it can live in Post.rankingScore and be
// used directly by an indexed ORDER BY instead of an in-memory re-rank).
//
// score = sign(base)·log10(max(|base|,1)) + (createdAtSeconds − EPOCH) / DECAY
//   base  = up − down + comments·1.5 + shares·2 + quality − reportPenalty
//   newer posts get a higher time term; engagement adds a log-scaled boost.

const EPOCH_SECONDS = 1_700_000_000 // ~2023-11 anchor, keeps the number small
const DECAY = 45_000 // ~12.5h per +1.0 of time term (Reddit's constant)

export interface RankingInput {
  upvoteCount: number
  downvoteCount: number
  commentCount: number
  shareCount: number
  qualityScore: number
  reportPenalty: number
  createdAt: Date | string
}

export function hotScore(s: RankingInput): number {
  const base =
    s.upvoteCount -
    s.downvoteCount +
    s.commentCount * 1.5 +
    s.shareCount * 2 +
    s.qualityScore -
    s.reportPenalty
  const sign = base > 0 ? 1 : base < 0 ? -1 : 0
  const magnitude = Math.log10(Math.max(Math.abs(base), 1))
  const seconds = new Date(s.createdAt).getTime() / 1000
  const score = sign * magnitude + (seconds - EPOCH_SECONDS) / DECAY
  return Number(score.toFixed(7))
}

// --- Author quality signal ---
// Cross-post reputation folded into every one of an author's posts via
// Post.qualityScore. Net-downvoted authors get a small negative term on ALL
// their content (the "show this user less" engine downvotes are meant to drive);
// net-upvoted authors get a small lift. Bounded so it nudges the per-post hot
// score rather than dominating it.
//
// ponytail: linear net/divisor with a hard cap — simplest monotonic mapping.
// `divisor` and `cap` are the calibration knobs: raise divisor for a gentler
// slope, raise cap to let reputation matter more. Move to a log/percentile
// curve only if raw net votes turn out wildly skewed across authors.
export const AUTHOR_SIGNAL = { divisor: 40, cap: 5 }

export function authorQualitySignal(
  netVotes: number,
  cfg: { divisor: number; cap: number } = AUTHOR_SIGNAL,
): number {
  const raw = netVotes / cfg.divisor
  const clamped = Math.max(-cfg.cap, Math.min(cfg.cap, raw))
  return Number(clamped.toFixed(3))
}
