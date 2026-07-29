import { FeedContent, MOCK_POSTS } from "./feed-content"
import type { FeedMembership, FeedPost } from "@/components/shared/FeedCard"
import { getFeed } from "@/modules/feed/query"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"

export const dynamic = "force-dynamic"

const MEMBERSHIPS: FeedMembership[] = [
  "associate",
  "student",
  "premium",
  "life",
  "inactive",
  "committee",
]

function relativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return "now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

type FeedRow = Awaited<ReturnType<typeof getFeed>>["rows"][number]

function mapRow(row: FeedRow): FeedPost {
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

  return {
    id: row.id,
    name,
    headline: author.profile?.headline ?? "",
    batch: author.profile?.batch?.label,
    // `city` is not selected by the feed query's postSelect, so location is omitted for real rows.
    location: undefined,
    house,
    membership,
    timestamp: relativeTime(row.createdAt),
    isVerified: author.isVerified,
    isPinned: row.isPinned,
    isEdited: row.isEdited,
    content: row.body ?? undefined,
    upvotes: row.upvoteCount,
    downvotes: row.downvoteCount,
    comments: row.commentCount,
    shares: row.shareCount,
    avatar,
    borderType: "blue",
  }
}

export default async function FeedPage() {
  const [schoolId, viewer] = await Promise.all([getDefaultSchoolId(), optionalUser()])

  let mappedReal: FeedPost[] = []
  if (schoolId) {
    const { rows } = await getFeed({ schoolId, viewerId: viewer?.id, pageSize: 30 })
    mappedReal = rows.map(mapRow)
  }

  return (
    <FeedContent userName="Guest" posts={[...mappedReal, ...MOCK_POSTS]} />
  )
}
