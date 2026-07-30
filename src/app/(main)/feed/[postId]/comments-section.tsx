"use client"

import Link from "next/link"
import { useOptimistic, useRef, useState, useTransition } from "react"
import { ShieldCheck } from "lucide-react"
import { commentOnPost } from "../actions"

export interface CommentView {
  id: string
  body: string
  createdAt: string // ISO
  author: {
    id: string
    username: string | null
    displayName: string
    isVerified: boolean
    avatarUrl: string
    headline: string | null
  }
}

interface Props {
  postId: string
  initialComments: CommentView[]
  initialCount: number
  viewer: null | {
    id: string
    displayName: string
    avatarUrl: string
  }
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

export default function CommentsSection({
  postId,
  initialComments,
  initialCount,
  viewer,
}: Props) {
  const [count, setCount] = useState(initialCount)
  const [comments, addOptimistic] = useOptimistic<CommentView[], CommentView>(
    initialComments,
    (state, newComment) => [...state, newComment],
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(formData: FormData) {
    if (!viewer) return
    const body = String(formData.get("body") ?? "").trim()
    if (!body) return

    const tempId = `optimistic-${Date.now()}`
    setError(null)

    startTransition(async () => {
      addOptimistic({
        id: tempId,
        body,
        createdAt: new Date().toISOString(),
        author: {
          id: viewer.id,
          username: null,
          displayName: viewer.displayName,
          isVerified: false,
          avatarUrl: viewer.avatarUrl,
          headline: null,
        },
      })
      setCount((c) => c + 1)
      formRef.current?.reset()

      try {
        await commentOnPost(postId, body)
      } catch {
        setError("Failed to post comment. Please try again.")
        setCount((c) => c - 1)
      }
    })
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl">
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          {count} {count === 1 ? "comment" : "comments"}
        </h2>
      </div>

      {viewer && (
        <form
          ref={formRef}
          action={submit}
          className="px-5 py-3 border-b border-gray-100 flex gap-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewer.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 space-y-2">
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Write a comment…"
              disabled={pending}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-70"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pending ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </form>
      )}

      <ul className="divide-y divide-gray-100">
        {comments.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-gray-400">
            No comments yet.
          </li>
        ) : (
          comments.map((c) => {
            const isOptimistic = c.id.startsWith("optimistic-")
            return (
              <li
                key={c.id}
                className={`px-5 py-4 flex gap-3 transition-opacity ${
                  isOptimistic ? "opacity-70" : ""
                }`}
              >
                <Link
                  href={c.author.username ? `/${c.author.username}` : "#"}
                  className="flex-shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.author.avatarUrl}
                    alt={c.author.displayName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">
                        {c.author.displayName}
                      </span>
                      {c.author.isVerified && (
                        <ShieldCheck className="h-3 w-3 text-blue-500 fill-blue-100" />
                      )}
                    </div>
                    {c.author.headline && (
                      <p className="text-xs text-gray-500 mb-1">{c.author.headline}</p>
                    )}
                    <p className="text-sm text-gray-700 whitespace-pre-line">{c.body}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {isOptimistic ? "Posting…" : relativeTime(c.createdAt)}
                  </p>
                </div>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
