"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Sparkles } from "lucide-react"
import { FeedCard, avatarColors, type FeedPost } from "@/components/shared/FeedCard"
import { ComposeTrigger } from "@/components/shared/ComposeTrigger"
import { ProfileSidebarView } from "@/components/shared/ProfileSidebarView"
import { SIDEBAR_NAV } from "@/config/sidebar-nav"
import {
  reactToPost,
  commentOnPost,
  throwEgg,
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

interface Connection {
  name: string
  role: string
  avatar: string
  hasStory?: boolean
}

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


const connections: Connection[] = [
  { name: "Judy Nguyen", role: "News Anchor · Nagpur", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
  { name: "Amanda Reed", role: "Web Developer · Mumbai", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", hasStory: true },
  { name: "Billy Vasquez", role: "News Anchor · Delhi", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" },
  { name: "Shubham Datarkar", role: "Web Developer · NNAWCA", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" },
  { name: "Carolyn Ortiz", role: "News Anchor · Pune", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face" },
]

const newsItems = [
  { title: "Alumni Reunion 2026 — Save the Date: October 15th", time: "2h" },
  { title: "Featured Alumni: Dr. Amit Verma's Journey in Medicine", time: "3h" },
  { title: "Exclusive Job Postings for Alumni — View Openings", time: "4h" },
  { title: "Mentorship Program: Help Current Students as an Alumni Mentor", time: "6h" },
  { title: "Campus Updates: See What's New at Your Alma Mater", time: "1d" },
]

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
  const followingOnly = activeTab === "following"
  const router = useRouter()
  const [newCount, setNewCount] = useState(0)
  const [eggedUsernames, setEggedUsernames] = useState<Set<string>>(() => new Set(initialEgged))
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
    setRemovedIds(new Set())
    setPage(2)
    setHasMore(initialHasMore)
    seenIds.current = new Set(posts.map((p) => p.id))
  }, [posts, initialHasMore])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return
    startLoadMore(async () => {
      try {
        const r = await loadMoreFeedAction(page, pageSize, followingOnly)
        const fresh = r.posts.filter((p) => !seenIds.current.has(p.id))
        for (const p of fresh) seenIds.current.add(p.id)
        setLocalPosts((cur) => [...cur, ...fresh])
        setHasMore(r.hasMore && fresh.length > 0)
        setPage(r.nextPage)
      } catch {
        // Silent — user can retry via button.
      }
    })
  }, [hasMore, loadingMore, page, pageSize, followingOnly])

  // Auto-load when sentinel enters viewport (Twitter/LinkedIn feel).
  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore()
      },
      { rootMargin: "600px 0px" },
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

  async function handleThrowEgg(username: string) {
    if (!username || eggedUsernames.has(username)) return
    setEggedUsernames((s) => new Set(s).add(username))
    const res = await throwEgg(username)
    if (!res.ok) {
      setEggedUsernames((s) => {
        const next = new Set(s)
        next.delete(username)
        return next
      })
    }
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
              <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 text-sm font-semibold">
                <a
                  href="/feed"
                  className={`flex-1 rounded-lg py-2 text-center transition-colors ${!followingOnly ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  For You
                </a>
                <a
                  href="/feed?tab=following"
                  className={`flex-1 rounded-lg py-2 text-center transition-colors ${followingOnly ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  Following
                </a>
              </div>
            )}
            {newCount > 0 && (
              <div className="sticky top-16 z-20 flex justify-center">
                <button
                  onClick={showNewPosts}
                  className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5 hover:bg-brand-600"
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
              <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
                <Sparkles className="h-4 w-4 flex-shrink-0" />
                You&rsquo;re all caught up — showing recent posts you may want to revisit.
              </div>
            )}

            {localPosts.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
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

              function optimisticRemove() {
                setRemovedIds((s) => new Set(s).add(post.id))
              }

              return (
                <div key={post.id} data-post-id={post.id}>
                <FeedCard
                  post={post}
                  isAuthor={isAuthor}
                  initialSaved={post.savedByViewer}
                  commentsLoader={loadPostCommentsAction}
                  onUpvote={() => void reactToPost(post.id, "upvote")}
                  onDownvote={() => void reactToPost(post.id, "downvote")}
                  onComment={(body) => void commentOnPost(post.id, body)}
                  onShare={() => sharePostAction(post.id)}
                  onSave={() => toggleSavePostAction(post.id)}
                  onAward={(key) => awardPostAction(post.id, key as never)}
                  onPollVote={
                    post.poll?.id
                      ? (optionId) => votePollAction(post.id, post.poll!.id!, optionId)
                      : undefined
                  }
                  onDelete={
                    isAuthor
                      ? () => {
                          optimisticRemove()
                          void deletePostAction(post.id).catch(() =>
                            setRemovedIds((s) => {
                              const next = new Set(s)
                              next.delete(post.id)
                              return next
                            }),
                          )
                        }
                      : undefined
                  }
                  onReport={
                    !isAuthor
                      ? (reason) => {
                          // Hide immediately for the reporter — small dopamine hit.
                          optimisticRemove()
                          void reportPostAction(post.id, reason).catch(() =>
                            setRemovedIds((s) => {
                              const next = new Set(s)
                              next.delete(post.id)
                              return next
                            }),
                          )
                        }
                      : undefined
                  }
                  onHide={
                    !isAuthor
                      ? () => {
                          optimisticRemove()
                          void hidePostAction(post.id).catch(() =>
                            setRemovedIds((s) => {
                              const next = new Set(s)
                              next.delete(post.id)
                              return next
                            }),
                          )
                        }
                      : undefined
                  }
                />
                </div>
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
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Load more posts
                  </button>
                )}
              </>
            )}

            {/* Premium CTA — only for tiers below premium (premium/life/committee
                are already at/above it, so don't upsell them). */}
            {!["premium", "life", "committee"].includes(viewer?.membership ?? "") && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
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

          {/* Right Sidebar */}
          <div className="w-full lg:w-[340px] flex-shrink-0">
            <div className="sticky top-20 space-y-3">
              {/* Sticky Ad */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Sponsored</span>
                  <a href="https://www.google.com" target="_blank" className="relative mt-2 block">
                    <Image src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop" alt="Ad" width={600} height={400} className="w-full h-auto rounded object-cover" />
                  </a>
                  <p className="mt-1.5 text-xs text-gray-400 text-center">Advertisement</p>
                </div>
              </div>

              {/* Connections Widget */}
              {(suggestions.length > 0 ? suggestions : connections).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h5 className="text-sm font-semibold text-gray-900">Throw 1 Egg to Poke Them</h5>
                  </div>
                  <div className="py-1">
                    {(suggestions.length > 0
                      ? suggestions.map((s) => ({
                          key: s.username || s.name,
                          name: s.name,
                          role: s.role,
                          avatar: s.avatar,
                          href: s.username ? `/${s.username}` : undefined,
                        }))
                      : connections.map((c) => ({
                          key: c.name,
                          name: c.name,
                          role: c.role,
                          avatar: c.avatar,
                          href: undefined,
                        }))
                    ).map((c) => {
                      const username = "username" in c ? (c as { username?: string }).username ?? "" : ""
                      const src = suggestions.length > 0 ? (suggestions.find((s) => (s.username || s.name) === c.key) ?? null) : null
                      const targetUsername = src?.username ?? username
                      const thrown = targetUsername ? eggedUsernames.has(targetUsername) : false
                      return (
                        <div key={c.key} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
                          <a href={c.href ?? "#"} className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full">
                            <Image src={c.avatar} alt={c.name} className="h-full w-full object-cover" fill sizes="36px" />
                          </a>
                          <div className="min-w-0 flex-1">
                            <a href={c.href ?? "#"} className="truncate text-sm font-medium text-gray-900 hover:text-brand block">{c.name}</a>
                            <p className="truncate text-xs text-gray-500">{c.role}</p>
                          </div>
                          <button
                            onClick={() => targetUsername && handleThrowEgg(targetUsername)}
                            disabled={!targetUsername || thrown}
                            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                              thrown ? "bg-amber-100 text-amber-600 opacity-60 cursor-default" : "bg-amber-50 text-amber-500 hover:bg-amber-100"
                            }`}
                            title={thrown ? "Egg thrown" : "Throw egg"}
                          >
                            🥚
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <a
                    href="/community"
                    className="block text-center py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    View more
                  </a>
                </div>
              )}

              {/* Alumni News — pinned posts */}
              {news.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h5 className="text-sm font-semibold text-gray-900">Alumni News</h5>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {news.map((item) => (
                      <div key={item.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <h6 className="text-xs font-medium leading-snug text-gray-700 line-clamp-2">
                          <a href={`/feed/${item.id}`} className="hover:text-brand transition-colors">{item.title}</a>
                        </h6>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
