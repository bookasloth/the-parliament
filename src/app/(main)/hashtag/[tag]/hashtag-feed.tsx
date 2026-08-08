"use client"

import PostCard from "@/app/(main)/feed/[postId]/post-card"
import type { FeedPost } from "@/components/shared/FeedCard"

type PostItem = { post: FeedPost; isAuthor: boolean; initialSaved: boolean }

export default function HashtagFeed({ posts }: { posts: PostItem[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-[5px] border border-gray-200 bg-white px-7 py-12 text-center text-sm text-gray-400">
        No posts with this hashtag yet.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {posts.map(({ post, isAuthor, initialSaved }) => (
        <PostCard key={post.id} post={post} isAuthor={isAuthor} initialSaved={initialSaved} defaultCommentsOpen={false} disableCardNav={false} />
      ))}
    </div>
  )
}
