"use client"

import { useState } from "react"
import { FeedCard, type FeedPost } from "@/components/shared/FeedCard"
import {
  reactToPost,
  commentOnPost,
  sharePostAction,
  toggleSavePostAction,
  awardPostAction,
  votePollAction,
  reportPostAction,
  hidePostAction,
} from "../feed/actions"

export default function SavedFeed({
  posts,
  viewerId,
}: {
  posts: FeedPost[]
  viewerId: string | null
}) {
  const [removed, setRemoved] = useState<Set<string>>(() => new Set())
  const drop = (id: string) => setRemoved((s) => new Set(s).add(id))
  const visible = posts.filter((p) => !removed.has(p.id))

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No saved posts yet. Tap the bookmark on any post to save it here.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {visible.map((post) => {
        const isAuthor = !!(viewerId && post.authorId === viewerId)
        return (
          <FeedCard
            key={post.id}
            post={post}
            isAuthor={isAuthor}
            initialSaved
            onUpvote={() => void reactToPost(post.id, "upvote")}
            onDownvote={() => void reactToPost(post.id, "downvote")}
            onComment={(body) => void commentOnPost(post.id, body)}
            onShare={() => sharePostAction(post.id)}
            onSave={async () => {
              const r = await toggleSavePostAction(post.id)
              if (r && !r.saved) drop(post.id) // unsaved → leave the saved list
              return r
            }}
            onAward={(key) => awardPostAction(post.id, key as never)}
            onPollVote={post.poll?.id ? (optionId) => votePollAction(post.id, post.poll!.id!, optionId) : undefined}
            onReport={!isAuthor ? (reason) => { drop(post.id); void reportPostAction(post.id, reason) } : undefined}
            onHide={!isAuthor ? () => { drop(post.id); void hidePostAction(post.id) } : undefined}
          />
        )
      })}
    </div>
  )
}
