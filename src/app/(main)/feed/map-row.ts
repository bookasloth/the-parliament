import type { getFeed } from "@/modules/feed/query"
import type { FeedPost, FeedMembership, BorderType } from "@/components/shared/FeedCard"

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

// Text-post background sentinel: media entry {type:"style", bg}.
function textBgFrom(media: unknown): string | undefined {
  if (!Array.isArray(media)) return undefined
  const s = media.find(
    (m) => m && typeof m === "object" && (m as { type?: string }).type === "style",
  ) as { bg?: string } | undefined
  return s?.bg
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
  const name = author.displayName || author.legalName
  const membership = MEMBERSHIPS.includes(author.membershipStatus as FeedMembership)
    ? (author.membershipStatus as FeedMembership)
    : "associate"
  const house = author.profile?.house
    ? { name: author.profile.house.name, color: author.profile.house.colorHex }
    : undefined
  const avatar =
    author.profile?.photoUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`

  const savedRows = (row as { savedBy?: { userId: string }[] }).savedBy ?? []
  const vr = (row as { viewerReaction?: string | null }).viewerReaction ?? null
  const viewerReaction: FeedPost["viewerReaction"] =
    vr === "upvote" || vr === "downvote" || vr === "like" ? vr : null

  const body = row.body ?? undefined
  const images = mediaUrls(row.media)
  // ponytail: quote author defaults to the poster (no separate quote-source column yet).
  const quote = row.format === "quote" && body ? { text: body, author: name } : undefined
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
    headline: author.profile?.headline ?? "",
    batch: author.profile?.batch?.label,
    location: undefined,
    house,
    membership,
    timestamp: relativeTime(row.createdAt),
    isVerified: author.isVerified,
    isPinned: row.isPinned,
    isEdited: row.isEdited,
    // Quote/question/poll render as their own blocks; don't also show raw body as text.
    content: quote || question || poll ? undefined : body,
    quote,
    question,
    poll,
    image: images.length === 1 ? images[0] : undefined,
    images: images.length > 1 ? images : undefined,
    mediaCount: images.length > 1 ? images.length : undefined,
    textBg: textBgFrom(row.media),
    upvotes: row.upvoteCount,
    downvotes: row.downvoteCount,
    comments: row.commentCount,
    shares: row.shareCount,
    avatar,
    borderType: BORDER_FOR_MEMBERSHIP[membership] ?? "blue",
  }
}
