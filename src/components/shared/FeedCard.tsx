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
  image?: string
  images?: string[]
  mediaCount?: number
  videoDuration?: string
  quote?: { text: string; author: string; source?: string }
  question?: string
  poll?: { question: string; options: string[] }
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

const borderAccents: Record<BorderType, string> = {
  blue: "bg-[#2563EB]/5",
  darkBlue: "bg-[#1E3A5F]/5",
  gold: "bg-[#D4A017]/5",
  grey: "bg-[#6B7280]/5",
  rgby: "bg-[#8B5CF6]/5",
  green: "bg-[#059669]/5",
}

const awards = [
  { emoji: "🐐", label: "GOAT", cost: 50 },
  { emoji: "💩", label: "Shitpost", cost: 20 },
  { emoji: "🔥", label: "Fire Post", cost: 30 },
  { emoji: "🧠", label: "Big Brain", cost: 40 },
  { emoji: "😂", label: "LOL", cost: 25 },
  { emoji: "🎤", label: "Mic Drop", cost: 35 },
  { emoji: "💪", label: "Support", cost: 30 },
  { emoji: "🤯", label: "WTF", cost: 28 },
  { emoji: "👏", label: "Clap", cost: 22 },
  { emoji: "👑", label: "Crown", cost: 60 },
  { emoji: "😇", label: "Angel", cost: 45 },
  { emoji: "🚀", label: "Rocket", cost: 55 },
]

// --- Award Modal ---
function AwardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const prev = useRef(open)

  useEffect(() => {
    if (prev.current && !open) setSelected(null)
    prev.current = open
  }, [open])

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
                key={a.label}
                onClick={() => setSelected(a.label)}
                className={`flex flex-col items-center rounded-lg p-2.5 transition-all ${
                  selected === a.label
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
          <span className="text-xs text-gray-400">
            {selected ? `Selected` : "Select an award to continue"}
          </span>
          <button
            disabled={!selected}
            className={`rounded-full px-5 py-1.5 text-xs font-semibold text-white transition-all ${
              selected ? "bg-brand hover:bg-brand-600" : "cursor-not-allowed bg-gray-200"
            }`}
          >
            Give Award
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
function ShareDropdown({ shares }: { shares: number }) {
  const { open, setOpen, ref } = useDropdown()

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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {[
            { icon: <Mail className="h-4 w-4" />, label: "Send via Direct Message" },
            { icon: <BookmarkCheck className="h-4 w-4" />, label: "Bookmark" },
            { icon: <LinkIcon className="h-4 w-4" />, label: "Copy link to post" },
            { icon: <Share2 className="h-4 w-4" />, label: "Share post via ..." },
            { icon: <PenSquare className="h-4 w-4" />, label: "Share to News Feed" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <span className="w-4 flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Full-width Reaction Bar ---
export function ReactionBar({
  initialUpvotes,
  initialDownvotes,
  comments,
  shares,
  onUpvote,
  onComment,
}: {
  initialUpvotes: number
  initialDownvotes: number
  comments: number
  shares: number
  onUpvote?: () => void
  onComment?: (body: string) => void
}) {
  const [awardModalOpen, setAwardModalOpen] = useState(false)
  const [voteState, setVoteState] = useState<"up" | "down" | null>(null)
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

        {/* Comment */}
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

        {/* Share */}
        <ShareDropdown shares={shares} />

        {/* Award */}
        <button
          onClick={() => setAwardModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50/30 transition-all"
        >
          <Award className="h-5 w-5" />
          <span className="hidden lg:inline text-xs font-medium">Award</span>
        </button>
      </div>
      {commentOpen && (
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
      <AwardModal open={awardModalOpen} onClose={() => setAwardModalOpen(false)} />
    </>
  )
}

// --- Poll Card ---
function PollCard({ question, options }: { question: string; options: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const totalVotes = 120
  const results = [
    { label: options[0], votes: 48 },
    { label: options[1], votes: 28 },
    { label: options[2], votes: 32 },
    { label: options[3], votes: 12 },
  ]

  return (
    <div>
      <p className="text-sm font-medium text-gray-900 mb-3">{question}</p>
      <div className="space-y-2">
        {results.map((opt, i) => {
          const pct = Math.round((opt.votes / totalVotes) * 100)
          const isSelected = selected === opt.label
          return (
            <button
              key={i}
              onClick={() => setSelected(opt.label)}
              className={`relative w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all overflow-hidden ${
                isSelected
                  ? "border-brand bg-brand-50"
                  : selected
                  ? "border-gray-200 opacity-70"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div
                className="absolute inset-0 bg-brand-50/40 transition-all"
                style={{ width: selected ? `${pct}%` : "0%" }}
              />
              <div className="relative flex items-center justify-between">
                <span className={isSelected ? "font-medium text-brand-700" : "text-gray-600"}>
                  {opt.label}
                </span>
                {selected && (
                  <span className="text-xs font-medium text-gray-500">{pct}%</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">{totalVotes} votes</p>
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
  onUpvote,
  onComment,
}: {
  post: FeedPost
  onUpvote?: () => void
  onComment?: (body: string) => void
}) {
  const { open: actionOpen, setOpen: setActionOpen, ref: actionRef } = useDropdown()

  const actionItems = post.isSponsored
    ? [{ icon: <Flag className="h-4 w-4" />, label: "Report Ad" }]
    : [
        { icon: <Bookmark className="h-4 w-4" />, label: "Save post" },
        { icon: <Copy className="h-4 w-4" />, label: "Copy link" },
        { icon: <Edit3 className="h-4 w-4" />, label: "Edit post" },
        { icon: <Trash2 className="h-4 w-4" />, label: "Delete" },
        { icon: <VolumeX className="h-4 w-4" />, label: "Mute user" },
        { icon: <Flag className="h-4 w-4" />, label: "Report post" },
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
                    onClick={() => setActionOpen(false)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
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
          <RichText text={post.content} />
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

        {post.poll && <PollCard question={post.poll.question} options={post.poll.options} />}

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
          initialUpvotes={post.upvotes}
          initialDownvotes={post.downvotes}
          comments={post.comments}
          shares={post.shares}
          onUpvote={onUpvote}
          onComment={onComment}
        />
      </div>
    </div>
  )
}
