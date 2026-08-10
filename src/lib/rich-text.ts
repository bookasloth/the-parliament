// Client-safe rich-text helpers (no prisma) — shared by the feed card renderer,
// the hashtag feed filter, and hashtag extraction. Kept pure so it can be unit-
// tested and imported into client components without dragging server deps.

export type RichToken =
  | { type: "text"; value: string }
  | { type: "mention"; value: string }
  | { type: "hashtag"; value: string; tag: string }
  | { type: "url"; value: string }

const TOKEN_RE = /(@\w+|#\w+|https?:\/\/\S+)/g

/** Split a post/comment body into ordered plain / @mention / #hashtag / URL runs. */
export function splitRichText(text: string): RichToken[] {
  return text
    .split(TOKEN_RE)
    .filter(Boolean)
    .map((part): RichToken => {
      if (part.startsWith("@")) return { type: "mention", value: part }
      if (part.startsWith("#")) return { type: "hashtag", value: part, tag: normalizeHashtag(part) }
      if (/^https?:\/\//.test(part)) return { type: "url", value: part }
      return { type: "text", value: part }
    })
}

/** Canonical hashtag form: strip leading '#', lowercase. Matches how
 *  extractHashtags stores tags so filtering is case-insensitive end to end. */
export function normalizeHashtag(tag: string): string {
  return tag.trim().replace(/^#+/, "").toLowerCase()
}

/** Link target for a rendered #hashtag → the tag-filtered feed. */
export function hashtagHref(tag: string): string {
  return `/feed?tag=${encodeURIComponent(normalizeHashtag(tag))}`
}

/** Prisma `Post.where` fragment matching posts carrying a given hashtag. */
export function postHashtagWhere(tag: string) {
  return { some: { hashtag: { tag: normalizeHashtag(tag) } } }
}
