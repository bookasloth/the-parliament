// Char-based post-body truncation for feed previews ("…see more").
// ponytail: char count, not line-measuring — SSR-safe, no layout read.
// Swap to a measured line-clamp only if char truncation looks wrong on real posts.

export const PREVIEW_LIMIT = 280

export interface Preview {
  shown: string
  truncated: boolean
}

/**
 * Trim `text` to a preview no longer than `limit` chars. Breaks on the last
 * whitespace before the limit (avoids cutting mid-word) and appends an ellipsis.
 * Returns the original text with truncated=false when it's already short enough.
 */
export function truncateForPreview(text: string, limit = PREVIEW_LIMIT): Preview {
  if (text.length <= limit) return { shown: text, truncated: false }
  const slice = text.slice(0, limit)
  const lastSpace = slice.lastIndexOf(" ")
  // Only break on a space if it's reasonably close to the limit, else hard-cut.
  const cut = lastSpace > limit - 40 ? lastSpace : limit
  return { shown: slice.slice(0, cut).trimEnd() + "…", truncated: true }
}
