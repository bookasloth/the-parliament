"use client"

import { useState, useEffect, useRef } from "react"
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
  Share2,
  PenSquare,
  Eye,
  ShieldCheck,
  Trash2,
  VolumeX,
  Copy,
  Edit3,
  Quote,
  Clock,
} from "lucide-react"

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

const membershipIconColor: Record<FeedMembership, string> = {
  associate: "text-amber-500",
  student: "text-green-500",
  premium: "text-blue-800",
  life: "text-yellow-500",
  inactive: "text-gray-400",
  committee: "text-pink-500",
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

const borderAccents: Record<BorderType, string> = {
  blue: "bg-[#2563EB]/5",
  darkBlue: "bg-[#1E3A5F]/5",
  gold: "bg-[#D4A017]/5",
  grey: "bg-[#6B7280]/5",
  rgby: "bg-[#8B5CF6]/5",
  green: "bg-[#059669]/5",
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

  function extShare(target: "whatsapp" | "linkedin" | "facebook" | "twitter") {
    if (typeof window === "undefined") return
    const enc = encodeURIComponent
    const url =
      target === "whatsapp" ? `https://wa.me/?text=${enc(`${shareText}: ${postUrl}`)}` :
      target === "linkedin" ? `https://www.linkedin.com/sharing/share-offsite/?url=${enc(postUrl)}` :
      target === "facebook" ? `https://www.facebook.com/sharer/sharer.php?u=${enc(postUrl)}` :
      `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(postUrl)}`
    window.open(url, "_blank", "noopener,noreferrer")
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
      >
        <Share2 className="h-5 w-5" />
        <span className="hidden lg:inline text-xs font-medium">Share</span>
        <span className="text-xs font-semibold tabular-nums">{shares}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={reshare}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
          >
            <PenSquare className="h-4 w-4 text-brand" /> Share to your feed
          </button>
          <button
            onClick={copyLink}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <LinkIcon className="h-4 w-4" /> {copied ? "Copied!" : "Copy link"}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={() => extShare("whatsapp")}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center text-[#25d366]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M20.52 3.48A11.87 11.87 0 0 0 12.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.34-1.66a11.87 11.87 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.42ZM12.06 21.8h-.01a9.89 9.89 0 0 1-5.04-1.38l-.36-.22-3.76.99 1-3.67-.24-.38a9.9 9.9 0 1 1 8.4 4.66Zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48a9.05 9.05 0 0 1-1.66-2.07c-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z"/>
              </svg>
            </span>
            WhatsApp
          </button>
          <button
            onClick={() => extShare("linkedin")}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center text-[#0a66c2]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.44-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>
              </svg>
            </span>
            LinkedIn
          </button>
          <button
            onClick={() => extShare("facebook")}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center text-[#1877f2]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.5h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"/>
              </svg>
            </span>
            Facebook
          </button>
          <button
            onClick={() => extShare("twitter")}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center text-black">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M18.24 2.25h3.31l-7.23 8.26L22.83 21.75H16.17l-5.21-6.82L4.99 21.75H1.68l7.73-8.83L1.25 2.25H8.08l4.71 6.23zm-1.16 17.52h1.84L7.08 4.13H5.12z"/>
              </svg>
            </span>
            X / Twitter
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
      <div className="h-px bg-[#E5E7EB]" />
      <div className="flex items-center justify-around py-1">
        {/* Upvote */}
        <button
          onClick={handleUpvote}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            voteState === "up"
              ? "text-brand bg-brand-50/50"
              : "text-gray-400 hover:text-brand hover:bg-brand-50/30"
          }`}
        >
          <ThumbsUp className={`h-5 w-5 ${voteState === "up" ? "fill-brand" : ""}`} />
          <span className="hidden lg:inline text-xs font-medium">Upvote</span>
          <span className="text-xs font-semibold tabular-nums">{upvotes}</span>
        </button>

        {/* Downvote */}
        <button
          onClick={handleDownvote}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            voteState === "down"
              ? "text-red-500 bg-red-50/50"
              : "text-gray-400 hover:text-red-500 hover:bg-red-50/30"
          }`}
        >
          <ThumbsDown className={`h-5 w-5 ${voteState === "down" ? "fill-red-500" : ""}`} />
          <span className="hidden lg:inline text-xs font-medium">Downvote</span>
          <span className="text-xs font-semibold tabular-nums">{downvotes}</span>
        </button>

        {/* Comment — links to post detail when commentHref is set */}
        {commentHref ? (
          <a
            href={commentHref}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden lg:inline text-xs font-medium">Comment</span>
            <span className="text-xs font-semibold tabular-nums">{commentCount}</span>
          </a>
        ) : (
          <button
            onClick={() => setCommentOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
              commentOpen
                ? "text-blue-500 bg-blue-50/50"
                : "text-gray-400 hover:text-blue-500 hover:bg-blue-50/30"
            }`}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden lg:inline text-xs font-medium">Comment</span>
            <span className="text-xs font-semibold tabular-nums">{commentCount}</span>
          </button>
        )}

        {/* Share */}
        <ShareDropdown postId={postId} shares={shares} onShare={onShare} />

        {/* Award */}
        <button
          onClick={() => setAwardModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50/30 transition-all"
        >
          <Award className="h-5 w-5" />
          <span className="hidden lg:inline text-xs font-medium">Award</span>
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
    : [
        {
          icon: saved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />,
          label: saved ? "Saved" : "Save post",
          onClick: handleSave,
        },
        { icon: <Copy className="h-4 w-4" />, label: "Copy link", onClick: handleCopy },
        ...(isAuthor
          ? [
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
              { icon: <VolumeX className="h-4 w-4" />, label: "Mute user" },
              { icon: <Flag className="h-4 w-4" />, label: "Report post", onClick: handleReport, danger: true },
            ]),
      ]

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl transition-shadow hover:shadow-card">
      {/* Card Header */}
      <div className={`px-4 pt-4 pb-2 ${borderAccents[post.borderType]} rounded-tr-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar with colored border */}
            <a href="#!" className="flex-shrink-0">
              {post.borderType === "rgby" ? (
                <div
                  className="h-12 w-12 rounded-full p-[2px]"
                  style={{ background: "conic-gradient(#EF4444, #EAB308, #22C55E, #3B82F6, #EF4444)" }}
                >
                  <img
                    src={post.avatar}
                    alt={post.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              ) : (
                <img
                  src={post.avatar}
                  alt={post.name}
                  className="h-12 w-12 rounded-full object-cover"
                  style={{ border: `2px solid ${avatarColors[post.borderType]}` }}
                />
              )}
            </a>
            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <h6 className="text-sm font-semibold text-gray-900 mb-0">
                  <a href="#!" className="hover:text-brand transition-colors">
                    {post.isSponsored ? post.sponsorName : post.name}
                  </a>
                </h6>
                {!post.isSponsored && (
                  <i className={`bi bi-asterisk text-sm ${membershipIconColor[post.membership]}`} />
                )}
                {!post.isSponsored && post.isVerified && (
                  <span className="group relative inline-flex items-center justify-center">
                    <ShieldCheck className="h-[14px] w-[14px] text-blue-500 fill-blue-500/10" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg">
                      Verified Alumni
                    </span>
                  </span>
                )}
                {post.isSponsored && <span className="text-xs text-gray-500">Sponsored</span>}
                <span className="text-xs text-[#6B7280]">
                  {post.timestamp}
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
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
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

        {post.images && !post.isSponsored ? (
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
