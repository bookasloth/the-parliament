"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useOptimistic, useRef, useState, useTransition, type ChangeEvent } from "react"
import { ThumbsDown, ThumbsUp, Flag, ImageIcon, MoreHorizontal, Trash2, X } from "lucide-react"
import { commentOnPost, reactToComment, deleteCommentAction, reportCommentAction } from "../actions"
import { VerifiedBadge } from "@/components/shared/feed-card/blocks"
import type { FeedMembership } from "@/components/shared/feed-card/types"
import EmojiPicker from "@/components/shared/EmojiPicker"
import MentionInput from "./mention-input"

function ComposerTools({
  onEmoji,
  onImageClick,
  imageDisabled,
}: {
  onEmoji: (e: string) => void
  onImageClick: () => void
  imageDisabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <EmojiPicker className="relative" onPick={onEmoji} />
      <button
        type="button"
        title="Add an image"
        disabled={imageDisabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onImageClick}
        className="inline-flex items-center rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

export interface CommentView {
  id: string
  body: string
  imageUrl: string | null
  createdAt: string // ISO
  score: number
  myReaction: "upvote" | "downvote" | null
  isAuthor: boolean
  author: {
    id: string
    username: string | null
    displayName: string
    isVerified: boolean
    membershipStatus: string
    avatarUrl: string
    headline: string | null
    batch: string | null
  }
  replies: CommentView[]
}

interface Viewer {
  id: string
  displayName: string
  avatarUrl: string
}

interface Props {
  postId: string
  initialComments: CommentView[]
  initialCount: number
  viewer: null | Viewer
  /** Inline-in-feed rendering: drop the outer card chrome + count header. */
  embedded?: boolean
}

type SortMode = "top" | "new"

type OptimisticAction =
  | { type: "top"; comment: CommentView }
  | { type: "reply"; parentId: string; comment: CommentView }
  | { type: "vote"; id: string; next: "upvote" | "downvote" | null; delta: number }
  | { type: "remove"; id: string }

// Membership tier → avatar ring colour (mirrors map-row.ts / AlumniProfileCard).
const RING: Record<string, string> = {
  life: "#D4A017",
  committee: "#8B5CF6",
  premium: "#1E3A5F",
  student: "#059669",
  associate: "#2563EB",
  inactive: "#6B7280",
}
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function makeView(body: string, viewer: Viewer, imageUrl: string | null = null): CommentView {
  return {
    id: `optimistic-${Date.now()}-${Math.round(performance.now())}`,
    body,
    imageUrl,
    createdAt: new Date().toISOString(),
    score: 0,
    myReaction: null,
    isAuthor: false,
    author: {
      id: viewer.id,
      username: null,
      displayName: viewer.displayName,
      isVerified: false,
      membershipStatus: "inactive",
      avatarUrl: viewer.avatarUrl,
      headline: null,
      batch: null,
    },
    replies: [],
  }
}

// Render @mentions as profile links, #tags + URLs as accents.
function Body({ text }: { text: string }) {
  const parts = text.split(/(@\w+|#\w+|https?:\/\/\S+)/g)
  return (
    <p className="text-sm text-gray-700 whitespace-pre-line">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <Link key={i} href={`/${part.slice(1)}`} className="font-medium text-brand hover:underline">
              {part}
            </Link>
          )
        }
        if (part.startsWith("#")) {
          return <span key={i} className="font-medium text-brand">{part}</span>
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

function Avatar({ c }: { c: CommentView }) {
  return (
    <Link href={c.author.username ? `/${c.author.username}` : "#"} className="flex-shrink-0">
      <Image
        src={c.author.avatarUrl}
        alt={c.author.displayName}
        className="h-9 w-9 rounded-full object-cover"
        style={{ boxShadow: `0 0 0 2px ${RING[c.author.membershipStatus] ?? "#2563EB"}` }}
        width={36}
        height={36}
      />
    </Link>
  )
}

// Local Follow/Message CTA — mirrors the FeedCard header (optimistic, wire later).
function CommentFollow() {
  const [following, setFollowing] = useState(false)
  return following ? (
    <a href="/messages" className="text-xs font-semibold text-brand hover:underline whitespace-nowrap">
      Message
    </a>
  ) : (
    <button
      onClick={() => setFollowing(true)}
      className="text-xs font-semibold text-brand hover:underline whitespace-nowrap"
    >
      Follow
    </button>
  )
}

function CommentBubble({ c, viewer }: { c: CommentView; viewer: Viewer | null }) {
  const isOptimistic = c.id.startsWith("optimistic-")
  const canFollow = !!viewer && viewer.id !== c.author.id
  return (
    <>
      <Avatar c={c} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900">{c.author.displayName}</span>
              {c.author.isVerified && (
                <VerifiedBadge membership={c.author.membershipStatus as FeedMembership} />
              )}
              {c.isAuthor && (
                <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                  Author
                </span>
              )}
              <span className="text-xs text-gray-400 whitespace-nowrap">
                · {isOptimistic ? "Posting…" : relativeTime(c.createdAt)}
              </span>
            </div>
            {c.author.batch && (
              <div className="-mt-0.5 text-[12px] text-gray-500 leading-tight">{c.author.batch}</div>
            )}
          </div>
          {canFollow && <CommentFollow />}
        </div>
        {c.body && (
          <div className="mt-1">
            <Body text={c.body} />
          </div>
        )}
        {c.imageUrl && (
          <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
            {/* Comment media is user-uploaded to our own bucket; plain img keeps it simple. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.imageUrl}
              alt="Comment attachment"
              className="max-h-80 w-auto max-w-full rounded-lg border border-gray-200 object-cover"
            />
          </a>
        )}
      </div>
    </>
  )
}

function CommentMenu({
  c,
  viewer,
  onDelete,
  onReport,
}: {
  c: CommentView
  viewer: Viewer | null
  onDelete: (c: CommentView) => void
  onReport: (c: CommentView) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  if (!viewer || c.id.startsWith("optimistic-")) return null
  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="More"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {c.isAuthor ? (
            <button
              onClick={() => { setOpen(false); onDelete(c) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-gray-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onReport(c) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              <Flag className="h-3.5 w-3.5" /> Report
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function VoteRow({
  c,
  viewer,
  onVote,
  onReplyClick,
  onDelete,
  onReport,
}: {
  c: CommentView
  viewer: Viewer | null
  onVote: (c: CommentView, type: "upvote" | "downvote") => void
  onReplyClick: () => void
  onDelete: (c: CommentView) => void
  onReport: (c: CommentView) => void
}) {
  const disabled = !viewer || c.id.startsWith("optimistic-")
  return (
    <div className="ml-12 mt-1 flex items-center gap-1 text-xs">
      <button
        onClick={() => onVote(c, "upvote")}
        disabled={disabled}
        className={`inline-flex items-center rounded p-0.5 hover:bg-gray-100 disabled:opacity-40 ${
          c.myReaction === "upvote" ? "text-brand" : "text-gray-500"
        }`}
        aria-label="Upvote"
      >
        <ThumbsUp className="h-4 w-4" fill={c.myReaction === "upvote" ? "currentColor" : "none"} />
      </button>
      <span className={`min-w-[1ch] text-center font-medium ${
        c.myReaction === "upvote" ? "text-brand" : c.myReaction === "downvote" ? "text-red-500" : "text-gray-600"
      }`}>
        {c.score}
      </span>
      <button
        onClick={() => onVote(c, "downvote")}
        disabled={disabled}
        className={`inline-flex items-center rounded p-0.5 hover:bg-gray-100 disabled:opacity-40 ${
          c.myReaction === "downvote" ? "text-red-500" : "text-gray-500"
        }`}
        aria-label="Downvote"
      >
        <ThumbsDown className="h-4 w-4" fill={c.myReaction === "downvote" ? "currentColor" : "none"} />
      </button>
      {viewer && (
        <button onClick={onReplyClick} className="ml-2 font-medium text-gray-500 hover:text-brand">
          Reply
        </button>
      )}
      <CommentMenu c={c} viewer={viewer} onDelete={onDelete} onReport={onReport} />
    </div>
  )
}

function CommentItem({
  comment,
  viewer,
  onReply,
  onVote,
  onDelete,
  onReport,
}: {
  comment: CommentView
  viewer: Viewer | null
  onReply: (parentId: string, body: string) => void
  onVote: (c: CommentView, type: "upvote" | "downvote") => void
  onDelete: (c: CommentView) => void
  onReport: (c: CommentView) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [showReplies, setShowReplies] = useState(false)

  function send() {
    const body = text.trim()
    if (!body) return
    onReply(comment.id, body)
    setText("")
    setOpen(false)
    setShowReplies(true)
  }

  return (
    <li className="px-5 py-4">
      <div className="flex gap-3">
        <CommentBubble c={comment} viewer={viewer} />
      </div>

      <VoteRow
        c={comment}
        viewer={viewer}
        onVote={onVote}
        onReplyClick={() => setOpen((o) => !o)}
        onDelete={onDelete}
        onReport={onReport}
      />

      {open && viewer && (
        <div className="ml-12 mt-2 flex items-center gap-2">
          <MentionInput
            value={text}
            onChange={setText}
            onEnter={send}
            placeholder="Write a reply…"
            autoFocus
            className="w-full rounded-full border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:bg-gray-200"
          >
            Reply
          </button>
        </div>
      )}

      {comment.replies.length > 0 && !showReplies && (
        <button
          onClick={() => setShowReplies(true)}
          className="ml-12 mt-2 text-xs font-semibold text-gray-500 hover:text-brand"
        >
          View {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
        </button>
      )}

      {comment.replies.length > 0 && showReplies && (
        <ul className="ml-12 mt-2 space-y-3 border-l border-gray-100 pl-3">
          {comment.replies.map((r) => (
            <li key={r.id} className={r.id.startsWith("optimistic-") ? "opacity-70" : ""}>
              <div className="flex gap-3">
                <CommentBubble c={r} viewer={viewer} />
              </div>
              <VoteRow
                c={r}
                viewer={viewer}
                onVote={onVote}
                onReplyClick={() => setOpen(true)}
                onDelete={onDelete}
                onReport={onReport}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// upvote/downvote optimistic delta given the previous vote.
function voteChange(
  prev: "upvote" | "downvote" | null,
  type: "upvote" | "downvote",
): { next: "upvote" | "downvote" | null; delta: number } {
  if (prev === type) return { next: null, delta: type === "upvote" ? -1 : 1 }
  if (prev === null) return { next: type, delta: type === "upvote" ? 1 : -1 }
  return { next: type, delta: type === "upvote" ? 2 : -2 } // switching sides
}

export default function CommentsSection({ postId, initialComments, initialCount, viewer, embedded = false }: Props) {
  const [count, setCount] = useState(initialCount)
  const [sort, setSort] = useState<SortMode>("top")
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-picking the same file
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/comments/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setImage(data.url)
      setFocused(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const [comments, applyOptimistic] = useOptimistic<CommentView[], OptimisticAction>(
    initialComments,
    (state, action) => {
      if (action.type === "top") return [...state, action.comment]
      if (action.type === "reply")
        return state.map((c) =>
          c.id === action.parentId ? { ...c, replies: [...c.replies, action.comment] } : c,
        )
      if (action.type === "remove")
        return state
          .filter((c) => c.id !== action.id)
          .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== action.id) }))
      // vote — patch matching top-level or reply.
      const patch = (c: CommentView): CommentView =>
        c.id === action.id ? { ...c, score: c.score + action.delta, myReaction: action.next } : c
      return state.map((c) => ({ ...patch(c), replies: c.replies.map(patch) }))
    },
  )
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const sorted = [...comments].sort((a, b) =>
    sort === "top"
      ? b.score - a.score || +new Date(b.createdAt) - +new Date(a.createdAt)
      : +new Date(b.createdAt) - +new Date(a.createdAt),
  )

  function submitTop() {
    if (!viewer) return
    const body = text.trim()
    const img = image
    if (!body && !img) return
    setError(null)
    setText("")
    setImage(null)
    setFocused(false)
    startTransition(async () => {
      applyOptimistic({ type: "top", comment: makeView(body, viewer, img) })
      setCount((c) => c + 1)
      try {
        await commentOnPost(postId, body, undefined, img ?? undefined)
      } catch {
        setError("Failed to post comment. Please try again.")
        setCount((c) => c - 1)
      }
    })
  }

  function handleReply(parentId: string, body: string) {
    if (!viewer) return
    startTransition(async () => {
      applyOptimistic({ type: "reply", parentId, comment: makeView(body, viewer) })
      setCount((c) => c + 1)
      try {
        await commentOnPost(postId, body, parentId)
      } catch {
        setError("Failed to post reply. Please try again.")
        setCount((c) => c - 1)
      }
    })
  }

  function handleVote(c: CommentView, type: "upvote" | "downvote") {
    if (!viewer || c.id.startsWith("optimistic-")) return
    const { next, delta } = voteChange(c.myReaction, type)
    startTransition(async () => {
      applyOptimistic({ type: "vote", id: c.id, next, delta })
      try {
        await reactToComment(postId, c.id, type)
      } catch {
        setError("Failed to record your vote. Please try again.")
      }
    })
  }

  function handleDelete(c: CommentView) {
    if (!viewer) return
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: c.id })
      setCount((n) => Math.max(0, n - 1))
      try {
        await deleteCommentAction(postId, c.id)
      } catch {
        // useOptimistic reverts automatically when the transition ends without
        // the server having removed it.
        setError("Failed to delete the comment. Please try again.")
        setCount((n) => n + 1)
      }
    })
  }

  function handleReport(c: CommentView) {
    if (!viewer) return
    const reason =
      typeof window !== "undefined"
        ? window.prompt("Report this comment — why?", "inappropriate")
        : null
    if (!reason) return
    startTransition(async () => {
      try {
        await reportCommentAction(postId, c.id, reason)
      } catch {
        setError("Failed to report the comment. Please try again.")
      }
    })
  }

  return (
    <section className={embedded ? "" : "bg-white border border-gray-200 rounded-xl"}>
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          {count} {count === 1 ? "comment" : "comments"}
        </h2>
        {comments.length > 1 && (
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setSort("top")}
              className={`rounded-full px-2.5 py-1 font-medium ${sort === "top" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Top
            </button>
            <button
              onClick={() => setSort("new")}
              className={`rounded-full px-2.5 py-1 font-medium ${sort === "new" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Newest
            </button>
          </div>
        )}
      </div>

      {viewer && (() => {
        const expanded = focused || text.trim().length > 0 || !!image || uploading
        const canPost = (text.trim().length > 0 || !!image) && !uploading
        return (
          <div className="px-5 py-3 border-b border-gray-100 flex gap-3">
            <Image src={viewer.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" width={36} height={36} />
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onPickImage}
              />
              <div className={expanded ? "rounded-2xl border border-gray-300 px-3 py-2" : "relative"}>
                <MentionInput
                  value={text}
                  onChange={setText}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  multiline
                  rows={expanded ? 2 : 1}
                  hideEmoji
                  placeholder="Add a comment…"
                  className={
                    expanded
                      ? "w-full resize-none bg-transparent text-sm outline-none"
                      : "w-full resize-none rounded-full border border-gray-200 py-2.5 pl-4 pr-24 text-sm outline-none focus:border-brand"
                  }
                />

                {uploading && <p className="mt-1 text-xs text-gray-400">Uploading image…</p>}
                {image && (
                  <div className="relative mt-2 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Attachment preview" className="max-h-40 rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/80 text-white hover:bg-gray-900"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {!expanded && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ComposerTools
                      onEmoji={(e) => setText((t) => t + e)}
                      onImageClick={() => fileInputRef.current?.click()}
                      imageDisabled={uploading || !!image}
                    />
                  </div>
                )}
                {expanded && (
                  <div className="mt-1 flex items-center justify-between">
                    <ComposerTools
                      onEmoji={(e) => setText((t) => t + e)}
                      onImageClick={() => fileInputRef.current?.click()}
                      imageDisabled={uploading || !!image}
                    />
                    <button
                      type="button"
                      onClick={submitTop}
                      disabled={!canPost}
                      className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      Comment
                    </button>
                  </div>
                )}
              </div>
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
          </div>
        )
      })()}

      <ul className="divide-y divide-gray-100">
        {comments.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-gray-400">No comments yet.</li>
        ) : (
          sorted.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              viewer={viewer}
              onReply={handleReply}
              onVote={handleVote}
              onDelete={handleDelete}
              onReport={handleReport}
            />
          ))
        )}
      </ul>
    </section>
  )
}
