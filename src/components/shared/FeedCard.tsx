"use client"

import { useState, useEffect, useRef } from "react"
import { MediaGallery, type MediaItem } from "@/components/shared/MediaGallery"
import {
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Award,
  Bookmark,
  X,
  Flag,
  Mail,
  BookmarkCheck,
  Link as LinkIcon,
  Send,
  Share2,
  Newspaper,
  Eye,
  Check,
  EyeOff,
  Ban,
  Trash2,
  Copy,
  Edit3,
  Quote,
  Clock,
} from "lucide-react"

// --- Verified badge (filled blue square + check) ---
function VerifiedBadge() {
  return (
    <span className="group relative inline-flex h-[15px] w-[15px] items-center justify-center rounded-[4px] bg-brand text-white">
      <Check className="h-[11px] w-[11px]" strokeWidth={3} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg">
        Verified Alumni
      </span>
    </span>
  )
}

// --- Types ---
export type BorderType = "blue" | "darkBlue" | "gold" | "grey" | "rgby" | "green"
export type FeedMembership = "associate" | "student" | "premium" | "life" | "inactive" | "committee"

export interface FeedPost {
  id: string
  /** Real author user id when known — enables author-only menu items. */
  authorId?: string
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

// `key` must match the server-side POST_AWARDS catalog (modules/feed/posts.ts).
const awards = [
  { emoji: "🐐", key: "GOAT", label: "GOAT", cost: 50 },
  { emoji: "💩", key: "SHITPOST", label: "Shitpost", cost: 20 },
  { emoji: "🔥", key: "FIRE", label: "Fire Post", cost: 30 },
  { emoji: "🧠", key: "BRAIN", label: "Big Brain", cost: 40 },
  { emoji: "😂", key: "LOL", label: "LOL", cost: 25 },
  { emoji: "🎤", key: "MICDROP", label: "Mic Drop", cost: 35 },
  { emoji: "💪", key: "SUPPORT", label: "Support", cost: 30 },
  { emoji: "🤯", key: "WTF", label: "WTF", cost: 28 },
  { emoji: "👏", key: "CLAP", label: "Clap", cost: 22 },
  { emoji: "👑", key: "CROWN", label: "Crown", cost: 60 },
  { emoji: "😇", key: "ANGEL", label: "Angel", cost: 45 },
  { emoji: "🚀", key: "ROCKET", label: "Rocket", cost: 55 },
]

// --- Award Modal ---
function AwardModal({
  open,
  onClose,
  onGive,
}: {
  open: boolean
  onClose: () => void
  onGive?: (awardKey: string) => Promise<{ ok: boolean; error?: string }> | void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prev = useRef(open)

  useEffect(() => {
    if (prev.current && !open) {
      setSelected(null)
      setError(null)
    }
    prev.current = open
  }, [open])

  async function submit() {
    if (!selected) return
    // `selected` is already the server-side award key.
    const key = selected
    if (!onGive) {
      onClose()
      return
    }
    setSubmitting(true)
    setError(null)
    const r = await Promise.resolve(onGive(key))
    setSubmitting(false)
    if (r && r.ok === false) {
      setError(r.error || "Failed to give award")
      return
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h5 className="text-base font-semibold text-gray-900">Give an Award</h5>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-4 text-xs text-gray-500">Each award costs karma points. Choose one to reward this post.</p>
          <div className="grid grid-cols-4 gap-2">
            {awards.map((a) => (
              <button
                key={a.key}
                onClick={() => setSelected(a.key)}
                className={`flex flex-col items-center rounded-lg p-2.5 transition-all ${
                  selected === a.key
                    ? "bg-brand-50 ring-1 ring-brand"
                    : "hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{a.emoji}</span>
                <span className="mt-0.5 text-[10px] font-semibold text-gray-700">{a.label}</span>
                <span className="text-[9px] text-gray-400">{a.cost}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
          <span className={`text-xs ${error ? "text-red-500" : "text-gray-400"}`}>
            {error ?? (selected ? `Selected` : "Select an award to continue")}
          </span>
          <button
            onClick={submit}
            disabled={!selected || submitting}
            className={`rounded-full px-5 py-1.5 text-xs font-semibold text-white transition-all ${
              selected && !submitting ? "bg-brand hover:bg-brand-600" : "cursor-not-allowed bg-gray-200"
            }`}
          >
            {submitting ? "Giving…" : "Give Award"}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Dropdown hook ---
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return { open, setOpen, ref }
}

// --- Share Dropdown ---
function ShareDropdown({
  postId,
  shares: initialShares,
  onShare,
}: {
  postId: string
  shares: number
  onShare?: () => void | Promise<unknown>
}) {
  const { open, setOpen, ref } = useDropdown()
  const [shares, setShares] = useState(initialShares)
  const [copied, setCopied] = useState(false)

  const postUrl =
    typeof window !== "undefined" ? `${window.location.origin}/feed/${postId}` : `/feed/${postId}`
  const shareText = `Check out this post on The Parliament`

  function reshare() {
    // One-click, no quote prompt.
    setShares((s) => s + 1)
    setOpen(false)
    if (onShare) {
      Promise.resolve(onShare()).catch(() => setShares((s) => s - 1))
    }
  }

  function copyLink() {
    if (typeof window === "undefined" || !navigator?.clipboard) return
    navigator.clipboard.writeText(postUrl).then(() => {
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setOpen(false)
      }, 900)
    }).catch(() => {})
  }

  function extShare(target: "dm" | "native") {
    if (typeof window === "undefined") return
    setOpen(false)
    if (target === "dm") {
      window.location.href = `/messages?share=${encodeURIComponent(postUrl)}`
      return
    }
    if (navigator.share) {
      navigator.share({ title: shareText, url: postUrl }).catch(() => {})
    } else {
      copyLink()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-brand hover:bg-gray-100 transition-all"
      >
        <Send className="h-[18px] w-[18px]" strokeWidth={1.6} />
        <span className="text-[13px] font-medium">Share{shares > 0 ? ` (${shares})` : ""}</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => extShare("dm")}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Mail className="h-4 w-4 text-gray-500" /> Send via Direct Message
          </button>
          <button
            onClick={reshare}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Bookmark className="h-4 w-4 text-gray-500" /> Bookmark
          </button>
          <button
            onClick={copyLink}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <LinkIcon className="h-4 w-4 text-gray-500" /> {copied ? "Copied!" : "Copy link to post"}
          </button>
          <button
            onClick={() => extShare("native")}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Share2 className="h-4 w-4 text-gray-500" /> Share post via …
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={reshare}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Newspaper className="h-4 w-4 text-brand" /> Share to News Feed
          </button>
        </div>
      )}
    </div>
  )
}

// --- Full-width Reaction Bar ---
export function ReactionBar({
  postId,
  initialUpvotes,
  initialDownvotes,
  initialVote = null,
  comments,
  shares,
  commentHref,
  onUpvote,
  onDownvote,
  onComment,
  onShare,
  onAward,
}: {
  postId: string
  initialUpvotes: number
  initialDownvotes: number
  initialVote?: "up" | "down" | null
  comments: number
  shares: number
  /** When set, the comment button navigates to the post detail instead of opening the inline composer. */
  commentHref?: string
  onUpvote?: () => void
  onDownvote?: () => void
  onComment?: (body: string) => void
  onShare?: () => void | Promise<unknown>
  onAward?: (awardKey: string) => Promise<{ ok: boolean; error?: string }> | void
}) {
  const [awardModalOpen, setAwardModalOpen] = useState(false)
  const [voteState, setVoteState] = useState<"up" | "down" | null>(initialVote)
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentCount, setCommentCount] = useState(comments)

  const handleUpvote = () => {
    if (voteState === "up") {
      setUpvotes((v) => v - 1)
      setVoteState(null)
    } else {
      if (voteState === "down") setDownvotes((v) => v - 1)
      setUpvotes((v) => v + 1)
      setVoteState("up")
    }
    onUpvote?.()
  }

  const handleSubmitComment = () => {
    const body = commentText.trim()
    if (!body) return
    onComment?.(body)
    setCommentCount((c) => c + 1)
    setCommentText("")
    setCommentOpen(false)
  }

  const handleDownvote = () => {
    if (voteState === "down") {
      setDownvotes((v) => v - 1)
      setVoteState(null)
    } else {
      if (voteState === "up") setUpvotes((v) => v - 1)
      setDownvotes((v) => v + 1)
      setVoteState("down")
    }
    onDownvote?.()
  }

  return (
    <>
      <div className="flex items-center justify-between py-1">
        {/* Upvote */}
        <button
          onClick={handleUpvote}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            voteState === "up"
              ? "text-brand bg-brand-50/50"
              : "text-gray-500 hover:text-brand hover:bg-brand-50/30"
          }`}
        >
          <ThumbsUp className={`h-[18px] w-[18px] ${voteState === "up" ? "fill-brand" : ""}`} strokeWidth={1.6} />
          <span className="text-[13px] font-medium">Upvote ({upvotes})</span>
        </button>

        {/* Downvote */}
        <button
          onClick={handleDownvote}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            voteState === "down"
              ? "text-red-500 bg-red-50/50"
              : "text-gray-500 hover:text-red-500 hover:bg-red-50/30"
          }`}
        >
          <ThumbsDown className={`h-[18px] w-[18px] ${voteState === "down" ? "fill-red-500" : ""}`} strokeWidth={1.6} />
          <span className="text-[13px] font-medium">Downvote ({downvotes})</span>
        </button>

        {/* Comment — links to post detail when commentHref is set */}
        {commentHref ? (
          <a
            href={commentHref}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50/30 transition-all"
          >
            <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.6} />
            <span className="text-[13px] font-medium">Comments ({commentCount})</span>
          </a>
        ) : (
          <button
            onClick={() => setCommentOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
              commentOpen
                ? "text-blue-500 bg-blue-50/50"
                : "text-gray-500 hover:text-blue-500 hover:bg-blue-50/30"
            }`}
          >
            <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.6} />
            <span className="text-[13px] font-medium">Comments ({commentCount})</span>
          </button>
        )}

        {/* Share */}
        <ShareDropdown postId={postId} shares={shares} onShare={onShare} />

        {/* Award */}
        <button
          onClick={() => setAwardModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50/30 transition-all"
        >
          <Award className="h-[18px] w-[18px]" strokeWidth={1.6} />
          <span className="text-[13px] font-medium">Award It</span>
        </button>
      </div>
      {commentOpen && !commentHref && (
        <div className="flex items-center gap-2 px-1 pb-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmitComment()
              }
            }}
            placeholder="Write a comment…"
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
            className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition-colors ${
              commentText.trim() ? "bg-brand hover:bg-brand-600" : "cursor-not-allowed bg-gray-200"
            }`}
          >
            Post
          </button>
        </div>
      )}
      <AwardModal
        open={awardModalOpen}
        onClose={() => setAwardModalOpen(false)}
        onGive={onAward}
      />
    </>
  )
}

// --- Poll Card ---
export function PollCard({
  poll,
  onVote,
}: {
  poll: NonNullable<FeedPost["poll"]>
  onVote?: (optionId: string) => void | Promise<unknown>
}) {
  const [myOptionId, setMyOptionId] = useState<string | null>(poll.myOptionId ?? null)
  const [options, setOptions] = useState(poll.options)
  const total = options.reduce((s, o) => s + o.votes, 0)
  const revealed = myOptionId != null || !!poll.isClosed

  function vote(optionId: string) {
    if (poll.isClosed || myOptionId === optionId) return
    const prevOption = myOptionId
    // Optimistic: shift the tally, then persist.
    setOptions((prev) =>
      prev.map((o) => {
        let v = o.votes
        if (o.id === prevOption) v -= 1
        if (o.id === optionId) v += 1
        return { ...o, votes: v }
      }),
    )
    setMyOptionId(optionId)
    if (onVote && poll.id) {
      Promise.resolve(onVote(optionId)).catch(() => {
        // Roll back on failure.
        setOptions(poll.options)
        setMyOptionId(prevOption)
      })
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-900 mb-3">{poll.question}</p>
      <div className="space-y-2">
        {options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
          const isMine = myOptionId === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={poll.isClosed}
              className={`relative w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all overflow-hidden ${
                isMine
                  ? "border-brand bg-brand-50"
                  : revealed
                  ? "border-gray-200 opacity-80"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              } ${poll.isClosed ? "cursor-default" : ""}`}
            >
              <div
                className="absolute inset-0 bg-brand-50/40 transition-all"
                style={{ width: revealed ? `${pct}%` : "0%" }}
              />
              <div className="relative flex items-center justify-between">
                <span className={isMine ? "font-medium text-brand-700" : "text-gray-600"}>
                  {opt.label}
                </span>
                {revealed && <span className="text-xs font-medium text-gray-500">{pct}%</span>}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {total} {total === 1 ? "vote" : "votes"}
        {poll.isClosed ? " · closed" : revealed ? "" : " · tap an option to vote"}
      </p>
    </div>
  )
}

// --- Rich Text Renderer ---
function RichText({ text }: { text: string }) {
  const parts = text.split(/(@\w+|#\w+|https?:\/\/\S+)/g)
  return (
    <p className="text-sm md:text-[15px] text-[#374151] leading-[1.7] whitespace-pre-line">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <button key={i} className="text-brand font-medium hover:underline">
              {part}
            </button>
          )
        }
        if (part.startsWith("#")) {
          return (
            <button key={i} className="text-brand font-medium hover:underline">
              {part}
            </button>
          )
        }
        if (part.startsWith("http")) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              {part}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

// --- Media Section ---
function MediaSection({ image, mediaCount, videoDuration }: { image: string; mediaCount?: number; videoDuration?: string }) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-lg">
      <img
        src={image}
        alt="Post media"
        className="w-full h-auto max-h-[500px] object-cover"
        loading="lazy"
      />
      {mediaCount && mediaCount > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5" />
          <span>+{mediaCount - 1} Photos</span>
        </div>
      )}
      {videoDuration && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Clock className="h-3 w-3" />
          <span>{videoDuration}</span>
        </div>
      )}
    </div>
  )
}

// --- Quote Block ---
function QuoteBlock({ quote }: { quote: { text: string; author: string; source?: string } }) {
  return (
    <div className="relative mt-2 rounded-xl bg-brand p-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Quote className="h-6 w-6 text-white/70" />
        </div>
        <div>
          <p className="text-base md:text-lg text-white leading-relaxed font-medium">
            {quote.text}
          </p>
          <p className="mt-3 text-sm text-white/80">&mdash; {quote.author}</p>
        </div>
      </div>
    </div>
  )
}

// --- HelpCircle icon (used in question banner) ---
function HelpCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

// --- Feed Card (the standard post card used everywhere) ---
export function FeedCard({
  post,
  isAuthor = false,
  initialSaved = false,
  onUpvote,
  onDownvote,
  onComment,
  onShare,
  onAward,
  onSave,
  onDelete,
  onReport,
  onPollVote,
}: {
  post: FeedPost
  isAuthor?: boolean
  initialSaved?: boolean
  onUpvote?: () => void
  onDownvote?: () => void
  onComment?: (body: string) => void
  onShare?: () => void | Promise<unknown>
  onAward?: (awardKey: string) => Promise<{ ok: boolean; error?: string }> | void
  onSave?: () => Promise<{ saved: boolean }> | void
  onDelete?: () => void | Promise<unknown>
  onReport?: (reason: string) => void | Promise<unknown>
  onPollVote?: (optionId: string) => void | Promise<unknown>
}) {
  const { open: actionOpen, setOpen: setActionOpen, ref: actionRef } = useDropdown()
  const [saved, setSaved] = useState(initialSaved)

  function handleSave() {
    setActionOpen(false)
    setSaved((s) => !s)
    if (onSave) {
      Promise.resolve(onSave())
        .then((r) => {
          if (r && typeof r.saved === "boolean") setSaved(r.saved)
        })
        .catch(() => setSaved((s) => !s))
    }
  }

  function handleCopy() {
    setActionOpen(false)
    if (typeof window !== "undefined" && navigator?.clipboard) {
      const url = `${window.location.origin}/feed/${post.id}`
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  function handleDelete() {
    setActionOpen(false)
    if (!onDelete) return
    if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return
    void onDelete()
  }

  function handleReport() {
    setActionOpen(false)
    if (!onReport) return
    const reason =
      typeof window !== "undefined"
        ? window.prompt("Why are you reporting this post?", "inappropriate")
        : null
    if (!reason) return
    void onReport(reason)
  }

  type ActionItem = { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean }
  const actionItems: ActionItem[] = post.isSponsored
    ? [{ icon: <Flag className="h-4 w-4" />, label: "Report Ad", onClick: handleReport }]
    : isAuthor
    ? [
        {
          icon: saved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />,
          label: saved ? "Saved" : "Bookmark It",
          onClick: handleSave,
        },
        { icon: <Copy className="h-4 w-4" />, label: "Copy link", onClick: handleCopy },
        {
          icon: <Edit3 className="h-4 w-4" />,
          label: "Edit post",
          onClick: () => {
            setActionOpen(false)
            if (typeof window !== "undefined") window.location.href = `/feed/${post.id}/edit`
          },
        },
        { icon: <Trash2 className="h-4 w-4" />, label: "Delete", onClick: handleDelete, danger: true },
      ]
    : [
        {
          icon: saved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />,
          label: saved ? "Saved" : "Bookmark It",
          onClick: handleSave,
        },
        { icon: <EyeOff className="h-4 w-4" />, label: "Hide It" },
        { icon: <Ban className="h-4 w-4" />, label: "Block Them" },
        { icon: <Flag className="h-4 w-4" />, label: "Report It", onClick: handleReport, danger: true },
      ]

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl transition-shadow hover:shadow-card">
      {/* Card Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <a href="#!" className="flex-shrink-0">
              <img
                src={post.avatar}
                alt={post.name}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
              />
            </a>
            {/* Info */}
            <div>
              <div className="flex items-center gap-1.5">
                <h6 className="text-[15px] font-semibold text-gray-900 mb-0">
                  <a href="#!" className="hover:text-brand transition-colors">
                    {post.isSponsored ? post.sponsorName : post.name}
                  </a>
                </h6>
                {!post.isSponsored && post.isVerified && <VerifiedBadge />}
                {post.isSponsored && <span className="text-xs text-gray-500">Sponsored</span>}
                <span className="text-xs text-[#6B7280]">
                  · {post.timestamp}
                  {post.isEdited && <span className="text-[#6B7280]"> · Edited</span>}
                </span>
              </div>
              {!post.isSponsored && post.batch && (
                <p className="mb-0 text-xs text-gray-500 mt-0.5">{post.batch}</p>
              )}
            </div>
          </div>
          {/* Overflow Menu */}
          <div className="relative" ref={actionRef}>
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {actionOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg">
                {actionItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick ?? (() => setActionOpen(false))}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 ${
                      item.danger ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    <span className="w-4 flex-shrink-0">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 pt-2 pb-1">
        {post.content && !post.isSponsored && !post.quote && !post.question && !post.poll && (
          post.textBg && TEXT_BG[post.textBg] ? (
            <div
              className="flex min-h-[180px] items-center justify-center rounded-lg p-6"
              style={{ background: TEXT_BG[post.textBg].bg }}
            >
              <p
                className="whitespace-pre-line text-center text-xl font-bold leading-snug text-white"
                style={TEXT_BG[post.textBg].fg ? { color: TEXT_BG[post.textBg].fg } : undefined}
              >
                {post.content}
              </p>
            </div>
          ) : (
            <RichText text={post.content} />
          )
        )}

        {post.isSponsored && (
          <div>
            <p className="text-sm text-gray-700 leading-relaxed">{post.sponsorTagline}</p>
            <p className="text-sm text-gray-700 mt-1">{post.content}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">Trusted by 100+ Clients</p>
              <a
                href={post.sponsorUrl}
                target="_blank"
                className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Get Quote
              </a>
            </div>
          </div>
        )}

        {post.poll && <PollCard poll={post.poll} onVote={onPollVote} />}

        {post.quote && <QuoteBlock quote={post.quote} />}

        {post.question && (
          <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-brand to-brand-700 min-h-[140px] flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]" />
            <div className="absolute top-3 right-3 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Question
            </div>
            <h2 className="relative px-6 text-center text-lg md:text-xl font-bold leading-snug text-white">
              {post.question}
            </h2>
          </div>
        )}

        {post.mediaItems && post.mediaItems.length > 0 && !post.isSponsored ? (
          <MediaGallery items={post.mediaItems} />
        ) : post.images && !post.isSponsored ? (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
            {post.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Photo ${i + 1}`}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
            ))}
          </div>
        ) : post.image && !post.isSponsored ? (
          <MediaSection
            image={post.image}
            mediaCount={post.mediaCount}
            videoDuration={post.videoDuration}
          />
        ) : null}
      </div>

      {/* Reaction Bar */}
      <div className="px-4 pb-2">
        <ReactionBar
          postId={post.id}
          initialUpvotes={post.upvotes}
          initialDownvotes={post.downvotes}
          initialVote={
            post.viewerReaction === "upvote" || post.viewerReaction === "like"
              ? "up"
              : post.viewerReaction === "downvote"
              ? "down"
              : null
          }
          comments={post.comments}
          shares={post.shares}
          // Inline quick-reply (onComment persists via commentOnPost). Full thread
          // still lives at /feed/[postId]; ponytail: no in-card thread view yet.
          onUpvote={onUpvote}
          onDownvote={onDownvote}
          onComment={onComment}
          onShare={onShare}
          onAward={onAward}
        />
      </div>
    </div>
  )
}
