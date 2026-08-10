import type { MediaItem } from "@/components/shared/MediaGallery"

// --- Types ---
export type BorderType = "blue" | "darkBlue" | "gold" | "grey" | "rgby" | "green"
export type FeedMembership = "associate" | "student" | "premium" | "life" | "inactive" | "committee"

export interface FeedPost {
  id: string
  /** Real author user id when known — enables author-only menu items. */
  authorId?: string
  /** Author username — links avatar/name to /[username]. Absent for anon/mock rows. */
  username?: string
  /** Whether the current viewer has saved this post. */
  savedByViewer?: boolean
  /** Viewer's current reaction on this post — hydrates the vote button on refresh. */
  viewerReaction?: "upvote" | "downvote" | "like" | null
  name: string
  headline: string
  batch?: string
  location?: string
  house?: { name: string; color: string }
  membership: FeedMembership
  timestamp: string
  /** LinkedIn-style connection degree shown next to the name, e.g. "2nd". */
  connectionDegree?: string
  /** Whether the viewer already follows the author — flips the header CTA to "Message". */
  isFollowing?: boolean
  isVerified?: boolean
  isPinned?: boolean
  isEdited?: boolean
  content?: string
  /** Facebook-style coloured background id for short text posts (see TEXT_BG). */
  textBg?: string
  image?: string
  images?: string[]
  mediaCount?: number
  videoDuration?: string
  /** Typed media (image/video) — rendered via MediaGallery with a lightbox. */
  mediaItems?: MediaItem[]
  quote?: { text: string; author: string; source?: string }
  /** Link post: the URL plus any server-fetched Open Graph metadata. */
  link?: { url: string; title?: string; description?: string; image?: string; siteName?: string }
  question?: string
  poll?: {
    id?: string
    question: string
    options: { id: string; label: string; votes: number }[]
    totalVotes: number
    myOptionId?: string | null
    isClosed?: boolean
  }
  isSponsored?: boolean
  sponsorName?: string
  /** Line under the sponsor name (like a profile's batch line). */
  sponsorSubhead?: string
  sponsorUrl?: string
  sponsorTagline?: string
  /** Sponsored CTA button label (defaults to "Learn more"). */
  sponsorCta?: string
  /** Optional secondary CTA (rendered as an outline button before the primary). */
  sponsorCta2?: string
  /** Brand accent (hex) for the CTA button + verified tick. Defaults to orange. */
  sponsorAccent?: string
  upvotes: number
  downvotes: number
  comments: number
  shares: number
  avatar: string
  borderType: BorderType
  memberSince?: string
  connections?: number
  posts?: number
}

export const avatarColors: Record<BorderType, string> = {
  blue: "#2563EB",
  darkBlue: "#1E3A5F",
  gold: "#D4A017",
  grey: "#6B7280",
  rgby: "#8B5CF6",
  green: "#059669",
}

// Single source of truth for text-post backgrounds (shared with PostComposer).
export { TEXT_BACKGROUNDS as TEXT_BG } from "@/config/text-backgrounds"

// Award grid — single source of truth shared with the server catalog.
export { POST_AWARD_LIST as awards } from "@/config/post-awards"
