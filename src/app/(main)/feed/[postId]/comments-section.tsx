"use client"

import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"
import { ArrowBigDown, ArrowBigUp, ShieldCheck, Smile } from "lucide-react"
import { commentOnPost, reactToComment } from "../actions"
import MentionInput from "./mention-input"

export interface CommentView {
  id: string
  body: string
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
}

type SortMode = "top" | "new"

type OptimisticAction =
  | { type: "top"; comment: CommentView }
  | { type: "reply"; parentId: string; comment: CommentView }
  | { type: "vote"; id: string; next: "upvote" | "downvote" | null; delta: number }

// Membership tier → avatar ring colour (mirrors map-row.ts / AlumniProfileCard).
const RING: Record<string, string> = {
  life: "#D4A017",
  committee: "#8B5CF6",
  premium: "#1E3A5F",
  student: "#059669",
  associate: "#2563EB",
  inactive: "#6B7280",
}
const ASTERISK: Record<string, string> = {
  associate: "text-amber-500",
  student: "text-green-500",
  premium: "text-blue-800",
  life: "text-yellow-500",
  inactive: "text-gray-400",
  committee: "text-pink-500",
}
const EMOJIS = ["😀", "😂", "❤️", "🔥", "👏", "🎉", "🙏", "💯", "😮", "😢", "👍", "🚀"]

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

function makeView(body: string, viewer: Viewer): CommentView {
  return {
    id: `optimistic-${Date.now()}-${Math.round(performance.now())}`,
    body,
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.author.avatarUrl}
        alt={c.author.displayName}
        className="h-9 w-9 rounded-full object-cover"
        style={{ boxShadow: `0 0 0 2px ${RING[c.author.membershipStatus] ?? "#2563EB"}` }}
      />
    </Link>
  )
}

function CommentBubble({ c }: { c: CommentView }) {
  const isOptimistic = c.id.startsWith("optimistic-")
  return (
    <>
      <Avatar c={c} />
      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold text-gray-900">{c.author.displayName}</span>
            <span className={`text-sm leading-none ${ASTERISK[c.author.membershipStatus] ?? "text-gray-400"}`}>*</span>
            {c.author.isVerified && <ShieldCheck className="h-3 w-3 text-blue-500 fill-blue-100" />}
            {c.isAuthor && (
              <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                Author
              </span>
            )}
          </div>
          {c.author.headline && <p className="text-xs text-gray-500 mb-1">{c.author.headline}</p>}
          <Body text={c.body} />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {isOptimistic ? "Posting…" : relativeTime(c.createdAt)}
        </p>
      </div>
    </>
  )
}

function VoteRow({
  c,
  viewer,
  onVote,
  onReplyClick,
}: {
  c: CommentView
  viewer: Viewer | null
  onVote: (c: CommentView, type: "upvote" | "downvote") => void
  onReplyClick: () => void
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
        <ArrowBigUp className="h-4 w-4" fill={c.myReaction === "upvote" ? "currentColor" : "none"} />
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
        <ArrowBigDown className="h-4 w-4" fill={c.myReaction === "downvote" ? "currentColor" : "none"} />
      </button>
      {viewer && (
        <button onClick={onReplyClick} className="ml-2 font-medium text-gray-500 hover:text-brand">
          Reply
        </button>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  viewer,
  onReply,
  onVote,
}: {
  comment: CommentView
  viewer: Viewer | null
  onReply: (parentId: string, body: string) => void
  onVote: (c: CommentView, type: "upvote" | "downvote") => void
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
        <CommentBubble c={comment} />
      </div>

      <VoteRow c={comment} viewer={viewer} onVote={onVote} onReplyClick={() => setOpen((o) => !o)} />

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
                <CommentBubble c={r} />
              </div>
              <VoteRow c={r} viewer={viewer} onVote={onVote} onReplyClick={() => setOpen(true)} />
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

export default function CommentsSection({ postId, initialComments, initialCount, viewer }: Props) {
  const [count, setCount] = useState(initialCount)
  const [sort, setSort] = useState<SortMode>("top")
  const [text, setText] = useState("")
  const [showEmoji, setShowEmoji] = useState(false)

  const [comments, applyOptimistic] = useOptimistic<CommentView[], OptimisticAction>(
    initialComments,
    (state, action) => {
      if (action.type === "top") return [...state, action.comment]
      if (action.type === "reply")
        return state.map((c) =>
          c.id === action.parentId ? { ...c, replies: [...c.replies, action.comment] } : c,
        )
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
    if (!body) return
    setError(null)
    setText("")
    setShowEmoji(false)
    startTransition(async () => {
      applyOptimistic({ type: "top", comment: makeView(body, viewer) })
      setCount((c) => c + 1)
      try {
        await commentOnPost(postId, body)
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

  return (
    <section className="bg-white border border-gray-200 rounded-xl">
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

      {viewer && (
        <div className="px-5 py-3 border-b border-gray-100 flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="relative">
              <MentionInput
                value={text}
                onChange={setText}
                multiline
                rows={2}
                placeholder="Write a comment…"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmoji((s) => !s)}
                  className="inline-flex items-center rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                  aria-label="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>
                {showEmoji && (
                  <div className="absolute left-0 top-full z-20 mt-1 grid w-56 grid-cols-6 gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setText((t) => t + e)}
                        className="rounded p-1 text-lg hover:bg-gray-100"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={submitTop}
                disabled={!text.trim()}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      <ul className="divide-y divide-gray-100">
        {comments.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-gray-400">No comments yet.</li>
        ) : (
          sorted.map((c) => (
            <CommentItem key={c.id} comment={c} viewer={viewer} onReply={handleReply} onVote={handleVote} />
          ))
        )}
      </ul>
    </section>
  )
}
