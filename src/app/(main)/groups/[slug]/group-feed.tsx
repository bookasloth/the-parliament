"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { FeedCard, type FeedPost } from "@/components/shared/FeedCard"
import {
  reactToPost, commentOnPost, sharePostAction, toggleSavePostAction,
  awardPostAction, votePollAction, deletePostAction, reportPostAction,
  hidePostAction, loadPostCommentsAction,
} from "@/app/(main)/feed/actions"
import { createGroupPostAction, loadGroupFeedAction } from "../actions"

interface Props {
  groupId: string
  canPost: boolean
  viewerId: string | null
  viewer: { id: string; displayName: string; avatarUrl: string } | null
  initialPosts: FeedPost[]
}

/** Group discussion feed (audit P1-6): a members-only composer + the group's
 *  posts. Reuses the shared FeedCard + feed server actions; interaction is gated
 *  on group membership server-side (assertCanInteract). */
export function GroupFeed({ groupId, canPost, viewerId, viewer, initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    startTransition(async () => {
      const next = await loadGroupFeedAction(groupId).catch(() => null)
      if (next) setPosts(next)
    })
  }

  function submit() {
    const text = body.trim()
    if (!text) return
    setError(null)
    startTransition(async () => {
      const res = await createGroupPostAction({ groupId, body: text })
      if (res.ok) {
        setBody("")
        refresh()
      } else {
        setError(res.error ?? "Could not post")
      }
    })
  }

  return (
    <div className="space-y-4">
      {canPost && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex gap-3">
            {viewer && (
              <Image src={viewer.avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" unoptimized />
            )}
            <div className="flex-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share something with the group…"
                rows={3}
                className="w-full resize-none rounded-[4px] border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={submit}
                  disabled={pending || !body.trim()}
                  className="rounded-[4px] bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {pending ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No posts yet.{canPost ? " Be the first to share something." : ""}
        </div>
      ) : (
        posts.map((post) => {
          const isAuthor = !!viewerId && post.authorId === viewerId
          return (
            <FeedCard
              key={post.id}
              post={post}
              isAuthor={isAuthor}
              initialSaved={post.savedByViewer ?? false}
              commentsLoader={loadPostCommentsAction}
              commentViewer={viewer}
              onUpvote={() => void reactToPost(post.id, "upvote")}
              onDownvote={() => void reactToPost(post.id, "downvote")}
              onComment={(b) => void commentOnPost(post.id, b)}
              onShare={() => sharePostAction(post.id)}
              onSave={() => toggleSavePostAction(post.id)}
              onAward={(key) => awardPostAction(post.id, key as never)}
              onPollVote={post.poll?.id ? (optionId) => votePollAction(post.id, post.poll!.id!, optionId) : undefined}
              onDelete={isAuthor ? () => { void deletePostAction(post.id).then(refresh) } : undefined}
              onReport={!isAuthor ? (reason) => { void reportPostAction(post.id, reason).then(refresh) } : undefined}
              onHide={!isAuthor ? () => { void hidePostAction(post.id).then(refresh) } : undefined}
            />
          )
        })
      )}
    </div>
  )
}
