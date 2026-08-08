"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import PostCard from "@/app/(main)/feed/[postId]/post-card"
import { ComposeTrigger } from "@/components/shared/ComposeTrigger"
import { loadMoreProfilePostsAction } from "./actions"
import type { FeedCursor } from "@/modules/feed/query"
import type { ProfileTimelinePost } from "./profile-view"

/**
 * Profile post timeline with keyset infinite-scroll. The initial page + cursor
 * come from the server (load-profile); subsequent pages are fetched on scroll
 * via loadMoreProfilePostsAction. `cursor === null` means the end (button/
 * observer disappear). Dedup-on-append guards against any overlap.
 */
export function ProfileTimeline({
  userId,
  initialPosts,
  initialCursor,
  isOwn,
  avatar,
  emptyName,
}: {
  userId: string
  initialPosts: ProfileTimelinePost[]
  initialCursor: FeedCursor | null
  isOwn: boolean
  avatar?: string
  emptyName: string
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return
    setLoading(true)
    try {
      const { posts: more, nextCursor } = await loadMoreProfilePostsAction(userId, cursor)
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.post.id))
        return [...prev, ...more.filter((p) => !seen.has(p.post.id))]
      })
      setCursor(nextCursor)
    } finally {
      setLoading(false)
    }
  }, [loading, cursor, userId])

  // Auto-load when the sentinel scrolls into view (600px early for a smooth run).
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !cursor) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore()
      },
      { rootMargin: "600px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [cursor, loadMore])

  return (
    <div className="flex flex-col gap-[18px]">
      {isOwn && <ComposeTrigger avatar={avatar} />}
      {posts.length > 0 ? (
        <>
          {posts.map(({ post, isAuthor, initialSaved }) => (
            <PostCard
              key={post.id}
              post={post}
              isAuthor={isAuthor}
              initialSaved={initialSaved}
              defaultCommentsOpen={false}
              disableCardNav={false}
            />
          ))}
          {cursor && (
            <div ref={sentinelRef} className="py-1 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="rounded-[4px] border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-[5px] border border-gray-200 bg-white">
          <div className="px-7 py-10 text-center">
            <p className="text-sm text-gray-500">
              {isOwn ? "You haven't posted yet." : `${emptyName} hasn't posted yet.`}
            </p>
            {isOwn && (
              <Link
                href="/compose"
                className="mt-3 inline-flex items-center gap-1.5 rounded-[4px] bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Write your first post
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
