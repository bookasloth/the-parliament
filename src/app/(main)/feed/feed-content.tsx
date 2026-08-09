"use client"

import { memo, useCallback, useEffect, useRef, useState, useTransition, type Dispatch, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Sparkles } from "lucide-react"
import { FeedCard, avatarColors, type FeedPost } from "@/components/shared/FeedCard"
import { ComposeTrigger } from "@/components/shared/ComposeTrigger"
import { ProfileSidebarView } from "@/components/shared/ProfileSidebarView"
import { SIDEBAR_NAV } from "@/config/sidebar-nav"
import {
  reactToPost,
  commentOnPost,
  sharePostAction,
  toggleSavePostAction,
  awardPostAction,
  deletePostAction,
  reportPostAction,
  hidePostAction,
  loadMoreFeedAction,
  votePollAction,
  countNewPostsAction,
  loadPostCommentsAction,
  recordImpressionsAction,
} from "./actions"
import { prepareImpressionBatch } from "@/modules/feed/impressions"
import { PostSkeleton } from "@/components/shared/feed-skeletons"
import Image from "next/image"
import { TimewheelAdCard } from "@/components/shared/TimewheelAdCard"

export type SuggestedConnection = {
  username: string
  name: string
  role: string
  avatar: string
}

export type NewsItem = {
  id: string
  title: string
  time: string
}

// --- Left Sidebar ---
export type ViewerCard = {
  name: string
  username: string | null
  photoUrl: string
  coverUrl: string | null
  headline: string
  batch: string
  house: string
  membership: string
  posts: number
  followers: number
  following: number
}

// One feed post, memoized so a parent re-render (new-post poll tick, load-more
// append, egg toggle) doesn't re-render every visible card — only rows whose
// `post` object identity actually changed. All callbacks live here, closing over
// the stable `post` and `setRemovedIds`, so they never leak instability upward.
// (Unchanged posts keep their object identity across localPosts updates, which
// are init/reset or append-only — so the shallow prop compare holds.)
const FeedRow = memo(function FeedRow({
  post,
  isAuthor,
  setRemovedIds,
  commentViewer,
}: {
  post: FeedPost
  isAuthor: boolean
  setRemovedIds: Dispatch<SetStateAction<Set<string>>>
  commentViewer?: { id: string; displayName: string; avatarUrl: string } | null
}) {
  const optimisticRemove = () => setRemovedIds((s) => new Set(s).add(post.id))
  const restore = () =>
    setRemovedIds((s) => {
      const next = new Set(s)
      next.delete(post.id)
      return next
    })
  return (
    <div data-post-id={post.id}>
      <FeedCard
        post={post}
        isAuthor={isAuthor}
        initialSaved={post.savedByViewer}
        commentsLoader={loadPostCommentsAction}
        commentViewer={commentViewer}
        onUpvote={() => void reactToPost(post.id, "upvote")}
        onDownvote={() => void reactToPost(post.id, "downvote")}
        onComment={(body) => void commentOnPost(post.id, body)}
        onShare={() => sharePostAction(post.id)}
        onSave={() => toggleSavePostAction(post.id)}
        onAward={(key) => awardPostAction(post.id, key as never)}
        onPollVote={
          post.poll?.id ? (optionId) => votePollAction(post.id, post.poll!.id!, optionId) : undefined
        }
        onDelete={
          isAuthor
            ? () => {
                optimisticRemove()
                void deletePostAction(post.id).catch(restore)
              }
            : undefined
        }
        onReport={
          !isAuthor
            ? (reason) => {
                // Hide immediately for the reporter — small dopamine hit.
                optimisticRemove()
                void reportPostAction(post.id, reason).catch(restore)
              }
            : undefined
        }
        onHide={
          !isAuthor
            ? () => {
                optimisticRemove()
                void hidePostAction(post.id).catch(restore)
              }
            : undefined
        }
      />
    </div>
  )
})

// --- FeedContent ---
export function FeedContent({
  userName,
  viewer = null,
  viewerId = null,
  posts = [],
  initialHasMore = false,
  pageSize = 15,
  suggestions = [],
  news = [],
  initialEgged = [],
  loadedAt,
  activeTab = "forYou",
  caughtUp = false,
}: {
  userName: string
  viewer?: ViewerCard | null
  viewerId?: string | null
  posts?: FeedPost[]
  initialHasMore?: boolean
  pageSize?: number
  suggestions?: SuggestedConnection[]
  news?: NewsItem[]
  initialEgged?: string[]
  loadedAt?: string
  activeTab?: "forYou" | "following"
  /** Viewer has seen every fresh post — feed is re-showing recent posts. */
  caughtUp?: boolean
}) {
  const commentViewer = viewerId && viewer
    ? { id: viewerId, displayName: viewer.name, avatarUrl: viewer.photoUrl }
    : null
  const followingOnly = activeTab === "following"
  const router = useRouter()
  const [newCount, setNewCount] = useState(0)
  const [localPosts, setLocalPosts] = useState<FeedPost[]>(posts)
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set())
  const [page, setPage] = useState(2) // first page already loaded server-side
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, startLoadMore] = useTransition()
  const seenIds = useRef<Set<string>>(new Set(posts.map((p) => p.id)))
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset when server sends fresh posts (e.g., after revalidation).
  useEffect(() => {
    setLocalPosts(posts)
    // Keep optimistic removals for ids the server STILL returns (read-replica lag
    // after a delete); drop them once the server stops returning the row. Blanket-
    // clearing here is what made a just-deleted post flash back in.
    setRemovedIds((prev) => new Set([...prev].filter((id) => posts.some((p) => p.id === id))))
    setPage(2)
    setHasMore(initialHasMore)
    seenIds.current = new Set(posts.map((p) => p.id))
  }, [posts, initialHasMore])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return
    startLoadMore(async () => {
      try {
        const r = await loadMoreFeedAction(page, pageSize, followingOnly, caughtUp)
        const fresh = r.posts.filter((p) => !seenIds.current.has(p.id))
        for (const p of fresh) seenIds.current.add(p.id)
        setLocalPosts((cur) => [...cur, ...fresh])
        setHasMore(r.hasMore && fresh.length > 0)
        setPage(r.nextPage)
      } catch {
        // Silent — user can retry via button.
      }
    })
  }, [hasMore, loadingMore, page, pageSize, followingOnly, caughtUp])

  // Load the next page only as the reader approaches the end (Google-Maps style:
  // fetch what's about to enter view, not the whole feed up front). The old 300ms
  // chained timer prefetched every page back-to-back regardless of scroll, burning
  // data for content the user never reached.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: "600px" }, // start ~one screen early so it feels seamless
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadMore])

  // Seen-tracking: record each real post once it's ~half on screen, batched and
  // debounced. Fire-and-forget — getFeed uses these to never repeat a post.
  const recordedImpr = useRef<Set<string>>(new Set())
  const pendingImpr = useRef<Set<string>>(new Set())
  const imprFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imprObserver = useRef<IntersectionObserver | null>(null)

  const flushImpressions = useCallback(() => {
    const batch = prepareImpressionBatch(pendingImpr.current)
    pendingImpr.current.clear()
    if (batch.length > 0) void recordImpressionsAction(batch)
  }, [])

  useEffect(() => {
    if (!viewerId || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (entries) => {
        let added = false
        for (const e of entries) {
          if (!e.isIntersecting || e.intersectionRatio < 0.5) continue
          const id = (e.target as HTMLElement).dataset.postId
          if (!id || recordedImpr.current.has(id)) continue
          recordedImpr.current.add(id)
          pendingImpr.current.add(id)
          added = true
          io.unobserve(e.target) // one impression per card
        }
        if (added) {
          if (imprFlushTimer.current) clearTimeout(imprFlushTimer.current)
          imprFlushTimer.current = setTimeout(flushImpressions, 1500)
        }
      },
      { threshold: [0.5] },
    )
    imprObserver.current = io
    document.querySelectorAll<HTMLElement>("[data-post-id]").forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      imprObserver.current = null
      if (imprFlushTimer.current) clearTimeout(imprFlushTimer.current)
      flushImpressions() // flush whatever's pending on unmount
    }
  }, [viewerId, flushImpressions])

  // Observe posts appended via load-more (re-observing a node is a no-op).
  useEffect(() => {
    const io = imprObserver.current
    if (!io) return
    document.querySelectorAll<HTMLElement>("[data-post-id]").forEach((n) => {
      const id = n.dataset.postId
      if (id && !recordedImpr.current.has(id)) io.observe(n)
    })
  }, [localPosts])

  // Poll for posts created since this page was rendered → "N new posts" pill.
  useEffect(() => {
    if (!loadedAt) return
    setNewCount(0)
    let active = true
    const check = async () => {
      try {
        const r = await countNewPostsAction(loadedAt)
        if (active) setNewCount(r.count)
      } catch {
        /* ignore — retried next tick */
      }
    }
    const id = setInterval(check, 30_000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [loadedAt])

  function showNewPosts() {
    setNewCount(0)
    router.refresh()
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      {/* Feed Layout */}
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - desktop only */}
          <div className="hidden lg:block w-full lg:w-[280px] flex-shrink-0">
            <div className="sticky top-20">
              <ProfileSidebarView viewer={viewer} nav={SIDEBAR_NAV.feed} />
            </div>
          </div>

          {/* Feed Column */}
          <div className="flex-1 min-w-0 space-y-3">
            {viewerId && (
              <div className="flex items-center gap-1 rounded-[5px] border border-gray-200 bg-white p-1 text-sm font-semibold">
                <a
                  href="/feed"
                  className={`flex-1 rounded-[4px] py-2 text-center transition-colors ${!followingOnly ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  For You
                </a>
                <a
                  href="/feed?tab=following"
                  className={`flex-1 rounded-[4px] py-2 text-center transition-colors ${followingOnly ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  Following
                </a>
              </div>
            )}
            {newCount > 0 && (
              <div className="sticky top-16 z-20 flex justify-center">
                <button
                  onClick={showNewPosts}
                  className="rounded-[3px] bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5 hover:bg-brand-600"
                >
                  {newCount} new post{newCount > 1 ? "s" : ""} · tap to refresh
                </button>
              </div>
            )}
            {/* Standard compose trigger */}
            <ComposeTrigger
              avatar={
                viewer?.photoUrl ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(viewer?.name ?? userName)}`
              }
            />

            {caughtUp && (
              <div className="flex items-center gap-2 rounded-[5px] border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
                <Sparkles className="h-4 w-4 flex-shrink-0" />
                You&rsquo;re all caught up — showing recent posts you may want to revisit.
              </div>
            )}

            {localPosts.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-[5px] p-8 text-center">
                {followingOnly ? (
                  <p className="text-sm text-gray-500">
                    Nothing here yet. Follow more alumni to fill your Following feed —{" "}
                    <a href="/community" className="font-semibold text-brand hover:underline">find people</a>.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    No posts yet. Be the first to share something.
                  </p>
                )}
              </div>
            )}

            {localPosts.map((post) => {
              if (removedIds.has(post.id)) return null
              // Real DB rows use UUIDs; mock rows use "1".."6". Sponsored ads
              // are never server-backed, so they take the handler-free branch.
              const isReal = post.id.length > 10 && !post.isSponsored
              const isAuthor = !!(viewerId && post.authorId && viewerId === post.authorId)
              if (!isReal) {
                return <FeedCard key={post.id} post={post} />
              }

              return (
                <FeedRow key={post.id} post={post} isAuthor={isAuthor} setRemovedIds={setRemovedIds} commentViewer={commentViewer} />
              )
            })}

            {/* Load-more sentinel + button */}
            {hasMore && (
              <>
                <div ref={sentinelRef} aria-hidden className="h-1" />
                {loadingMore ? (
                  <>
                    <PostSkeleton />
                    <PostSkeleton />
                  </>
                ) : (
                  <button
                    onClick={loadMore}
                    className="w-full rounded-[5px] border border-gray-200 bg-white py-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Load more posts
                  </button>
                )}
              </>
            )}

            {/* Premium CTA — only for tiers below premium (premium/life/committee
                are already at/above it, so don't upsell them). */}
            {!["premium", "life", "committee"].includes(viewer?.membership ?? "") && (
              <div className="bg-white border border-gray-200 rounded-[4px] p-4 text-center">
                <p className="text-sm font-medium text-gray-700">
                  <Sparkles className="inline h-4 w-4 text-brand mr-1" />
                  Unlock more with Premium Membership
                </p>
                <a
                  href="/membership"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600 transition-colors"
                >
                  Learn more <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Right Sidebar — Timewheel ads */}
          <div className="hidden lg:block w-full lg:w-[340px] flex-shrink-0">
            <div className="sticky top-20">
              <TimewheelAdCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
