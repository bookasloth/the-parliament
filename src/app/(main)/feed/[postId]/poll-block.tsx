"use client"

import { PollCard, type FeedPost } from "@/components/shared/FeedCard"
import { votePollAction } from "../actions"

export default function PollBlock({
  postId,
  poll,
}: {
  postId: string
  poll: NonNullable<FeedPost["poll"]>
}) {
  return (
    <PollCard
      poll={poll}
      onVote={poll.id ? (optionId) => votePollAction(postId, poll.id!, optionId) : undefined}
    />
  )
}
