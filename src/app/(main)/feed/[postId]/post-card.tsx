"use client"

import { useRouter } from "next/navigation"
import { FeedCard, type FeedPost } from "@/components/shared/FeedCard"
import {
  reactToPost,
  commentOnPost,
  sharePostAction,
  toggleSavePostAction,
  awardPostAction,
  reportPostAction,
  deletePostAction,
  hidePostAction,
  votePollAction,
  loadPostCommentsAction,
} from "../actions"

// The post detail view: the same FeedCard used in the feed, with comments
// opened on mount so the thread is visible. Keeps a single source of truth for
// how a post renders — no bespoke detail layout to drift out of sync.
export default function PostCard({
  post,
  isAuthor,
  initialSaved,
  defaultCommentsOpen = true,
  disableCardNav = true,
}: {
  post: FeedPost
  isAuthor: boolean
  initialSaved: boolean
  /** Detail page opens comments + disables nav; a list (profile timeline) wants neither. */
  defaultCommentsOpen?: boolean
  disableCardNav?: boolean
}) {
  const router = useRouter()
  return (
    <FeedCard
      post={post}
      isAuthor={isAuthor}
      initialSaved={initialSaved}
      commentsLoader={loadPostCommentsAction}
      defaultCommentsOpen={defaultCommentsOpen}
      disableCardNav={disableCardNav}
      onUpvote={() => void reactToPost(post.id, "upvote")}
      onDownvote={() => void reactToPost(post.id, "downvote")}
      onComment={(body) => void commentOnPost(post.id, body)}
      onShare={() => sharePostAction(post.id)}
      onSave={() => toggleSavePostAction(post.id)}
      onAward={(key) => awardPostAction(post.id, key as never)}
      onPollVote={
        post.poll?.id ? (optionId) => votePollAction(post.id, post.poll!.id!, optionId) : undefined
      }
      onHide={!isAuthor ? () => hidePostAction(post.id) : undefined}
      onReport={!isAuthor ? (reason) => reportPostAction(post.id, reason) : undefined}
      onDelete={
        isAuthor
          ? () => {
              void deletePostAction(post.id)
              router.push("/feed")
            }
          : undefined
      }
    />
  )
}
