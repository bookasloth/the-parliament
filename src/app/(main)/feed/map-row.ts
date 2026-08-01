import type { getFeed } from "@/modules/feed/query"
import type { FeedPost, FeedMembership, BorderType } from "@/components/shared/FeedCard"
import type { MediaItem } from "@/components/shared/MediaGallery"

type FeedRow = Awaited<ReturnType<typeof getFeed>>["rows"][number]

const MEMBERSHIPS: FeedMembership[] = [
  "associate",
  "student",
  "premium",
  "life",
  "inactive",
  "committee",
]

// Give each membership tier its own avatar ring instead of a uniform blue.
const BORDER_FOR_MEMBERSHIP: Record<FeedMembership, BorderType> = {
  life: "gold",
  committee: "rgby",
  premium: "darkBlue",
  student: "green",
  inactive: "grey",
  associate: "blue",
}

// Pull displayable image URLs out of Post.media (Json array of {key,type,url?}).
function mediaUrls(media: unknown): string[] {
  if (!Array.isArray(media)) return []
  return media
    .map((m) => (m && typeof m === "object" ? (m as { url?: string }).url : undefined))
    .filter((u): u is string => typeof u === "string" && u.length > 0)
}

// Typed media items (image/video) for the gallery — skips the style sentinel.
function mediaItemsFrom(media: unknown): MediaItem[] {
  if (!Array.isArray(media)) return []
  return media
    .filter((m): m is { url?: string; type?: string } => !!m && typeof m === "object")
    .filter((m) => typeof m.url === "string" && m.url.length > 0 && m.type !== "style")
    .map((m) => ({
      url: m.url as string,
      type: (m.type ?? "").startsWith("video") ? "video" : "image",
    }))
}

// Text-post background sentinel: media entry {type:"style", bg}.
function textBgFrom(media: unknown): string | undefined {
  if (!Array.isArray(media)) return undefined
  const s = media.find(
    (m) => m && typeof m === "object" && (m as { type?: string }).type === "style",
  ) as { bg?: string } | undefined
  return s?.bg
}

// "21st batch (2006 - 2013)". Ordinal = startYear − 1985 (JNV Nagpur's 1st
// batch entered 1986). ponytail: single-school constant; derive from the
// school's earliest batch if/when multi-school batches land.
function ordinalSuffix(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return "th"
  switch (n % 10) {
    case 1: return "st"
    case 2: return "nd"
    case 3: return "rd"
    default: return "th"
  }
}

export function formatBatch(
  batch: { label: string; startYear?: number; endYear?: number } | null | undefined,
): string | undefined {
  if (!batch) return undefined
  if (batch.startYear == null || batch.endYear == null) return batch.label
  const ordinal = batch.startYear - 1985
  const prefix = ordinal >= 1 ? `${ordinal}${ordinalSuffix(ordinal)} batch ` : ""
  return `${prefix}(${batch.startYear} - ${batch.endYear})`
}

export function relativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return "now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function mapRowToFeedPost(row: FeedRow): FeedPost {
  const author = row.author
  const anon = (row as { isAnonymous?: boolean }).isAnonymous ?? false
  const name = anon ? "Anonymous JNVian" : author.displayName || author.legalName
  const membership = MEMBERSHIPS.includes(author.membershipStatus as FeedMembership)
    ? (author.membershipStatus as FeedMembership)
    : "associate"
  const house = anon
    ? undefined
    : author.profile?.house
      ? { name: author.profile.house.name, color: author.profile.house.colorHex }
      : undefined
  const avatar = anon
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent("Anonymous")}&background=e5e7eb&color=6b7280`
    : author.profile?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`

  const savedRows = (row as { savedBy?: { userId: string }[] }).savedBy ?? []
  const vr = (row as { viewerReaction?: string | null }).viewerReaction ?? null
  const viewerReaction: FeedPost["viewerReaction"] =
    vr === "upvote" || vr === "downvote" || vr === "like" ? vr : null

  const body = row.body ?? undefined
  const images = mediaUrls(row.media)
  const quoteSource = (row as { quoteSource?: string | null }).quoteSource
  const quote =
    row.format === "quote" && body ? { text: body, author: quoteSource || name } : undefined
  const question = row.format === "question" ? body : undefined

  const pollRow = (
    row as {
      poll?: {
        id: string
        question: string
        expiresAt: Date | null
        totalVotes: number
        options: { id: string; label: string; voteCount: number }[]
        votes?: { optionId: string }[]
      } | null
    }
  ).poll
  const poll = pollRow
    ? {
        id: pollRow.id,
        question: pollRow.question,
        options: pollRow.options.map((o) => ({ id: o.id, label: o.label, votes: o.voteCount })),
        totalVotes: pollRow.totalVotes,
        myOptionId: pollRow.votes?.[0]?.optionId ?? null,
        isClosed: pollRow.expiresAt ? new Date(pollRow.expiresAt) < new Date() : false,
      }
    : undefined

  return {
    id: row.id,
    authorId: author.id,
    savedByViewer: savedRows.length > 0,
    viewerReaction,
    name,
    headline: anon ? "" : author.profile?.headline ?? "",
    batch: anon ? undefined : formatBatch(author.profile?.batch),
    location: undefined,
    house,
    membership,
    timestamp: relativeTime(row.createdAt),
    isVerified: anon ? false : author.isVerified,
    isPinned: row.isPinned,
    isEdited: row.isEdited,
    // Quote/question/poll render as their own blocks; don't also show raw body as text.
    content: quote || question || poll ? undefined : body,
    quote,
    question,
    poll,
    mediaItems: mediaItemsFrom(row.media),
    image: images.length === 1 ? images[0] : undefined,
    images: images.length > 1 ? images : undefined,
    mediaCount: images.length > 1 ? images.length : undefined,
    textBg: (row as { textBg?: string | null }).textBg ?? textBgFrom(row.media),
    upvotes: row.upvoteCount,
    downvotes: row.downvoteCount,
    comments: row.commentCount,
    shares: row.shareCount,
    avatar,
    borderType: BORDER_FOR_MEMBERSHIP[membership] ?? "blue",
  }
}
