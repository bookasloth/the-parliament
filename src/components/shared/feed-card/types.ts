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
  sponsorUrl?: string
  sponsorTagline?: string
  /** Sponsored CTA button label (defaults to "Learn more"). */
  sponsorCta?: string
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

// Coloured text-post backgrounds — mirrors BG_OPTIONS in the composer.
// ponytail: duplicated here (like the membership/house colours already are) to
// keep the card self-contained; keep in sync with compose/page.tsx if edited.
export const TEXT_BG: Record<string, { bg: string; fg?: string }> = {
  navy: { bg: "linear-gradient(135deg,#1a3a6b,#0b1c38)" },
  brand: { bg: "linear-gradient(135deg,#009ae4,#005c8c)" },
  sunset: { bg: "linear-gradient(135deg,#ff8a5b,#e75480)" },
  gold: { bg: "linear-gradient(135deg,#ffd119,#d4a800)" },
  forest: { bg: "linear-gradient(135deg,#3ea35f,#1f6b3e)" },
  violet: { bg: "linear-gradient(135deg,#9b6cff,#5a2ec0)" },
  christmas: { bg: "linear-gradient(135deg,#c0392b 0%,#0e7a3a 100%)" },
  tricolour: {
    bg: "linear-gradient(180deg,#FF9933 0%,#FF9933 33%,#ffffff 33%,#ffffff 66%,#138808 66%,#138808 100%)",
    fg: "#1a3a6b",
  },
}

// Award grid — single source of truth shared with the server catalog.
export { POST_AWARD_LIST as awards } from "@/config/post-awards"
