"use client"

import { useState, useEffect, useRef } from "react"
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Award,
  Bookmark,
  X,
  Mail,
  Link as LinkIcon,
  Send,
  Share2,
  Newspaper,
} from "lucide-react"
import { useDropdown } from "./use-dropdown"
import { awards } from "./types"
import EmojiPicker from "@/components/shared/EmojiPicker"

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
      <div className="fixed inset-0 bg-black/60" role="presentation" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h5 className="text-base font-semibold text-gray-900">Give an Award</h5>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors" aria-label="Close">
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
        <Send className="h-4 w-4" strokeWidth={1.6} />
        <span className="text-[13px] font-medium"><span className="hidden sm:inline">Share</span>{shares > 0 ? ` (${shares})` : ""}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
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
  onCommentClick,
  commentsExpanded = false,
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
  /** When set, the comment button calls this (e.g. expand inline thread) instead of the built-in quick composer. */
  onCommentClick?: () => void
  /** Active-state styling for the comment button when the inline thread is open. */
  commentsExpanded?: boolean
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
      <div className="flex items-center justify-between py-1 tabular-nums">
        {/* Upvote */}
        <button
          onClick={handleUpvote}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            voteState === "up"
              ? "text-brand hover:bg-brand-50/30"
              : "text-gray-500 hover:text-brand hover:bg-brand-50/30"
          }`}
        >
          <ThumbsUp className={`h-4 w-4 ${voteState === "up" ? "fill-brand" : ""}`} strokeWidth={1.6} />
          <span className="text-[13px] font-medium"><span className="hidden sm:inline">Upvote </span>({upvotes})</span>
        </button>

        {/* Downvote */}
        <button
          onClick={handleDownvote}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            voteState === "down"
              ? "text-red-500 hover:bg-red-50/30"
              : "text-gray-500 hover:text-red-500 hover:bg-red-50/30"
          }`}
        >
          <ThumbsDown className={`h-4 w-4 ${voteState === "down" ? "fill-red-500" : ""}`} strokeWidth={1.6} />
          <span className="text-[13px] font-medium"><span className="hidden sm:inline">Downvote </span>({downvotes})</span>
        </button>

        {/* Comment — detail link (commentHref) › inline expander (onCommentClick) › built-in composer */}
        {commentHref ? (
          <a
            href={commentHref}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50/30 transition-all"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.6} />
            <span className="text-[13px] font-medium"><span className="hidden sm:inline">Comments </span>({commentCount})</span>
          </a>
        ) : (
          <button
            onClick={onCommentClick ?? (() => setCommentOpen((o) => !o))}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
              (onCommentClick ? commentsExpanded : commentOpen)
                ? "text-blue-500 hover:bg-blue-50/30"
                : "text-gray-500 hover:text-blue-500 hover:bg-blue-50/30"
            }`}
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.6} />
            <span className="text-[13px] font-medium"><span className="hidden sm:inline">Comments </span>({commentCount})</span>
          </button>
        )}

        {/* Share */}
        <ShareDropdown postId={postId} shares={shares} onShare={onShare} />

        {/* Award */}
        <button
          onClick={() => setAwardModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50/30 transition-all"
        >
          <Award className="h-4 w-4" strokeWidth={1.6} />
          <span className="text-[13px] font-medium hidden sm:inline">Award It</span>
        </button>
      </div>
      {commentOpen && !commentHref && (
        <div className="flex items-center gap-2 px-1 pb-2">
          <div className="relative flex-1">
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
              className="w-full rounded-full border border-gray-200 pl-4 pr-9 py-2 text-sm outline-none focus:border-brand"
            />
            <EmojiPicker
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onPick={(e) => setCommentText((t) => t + e)}
            />
          </div>
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
