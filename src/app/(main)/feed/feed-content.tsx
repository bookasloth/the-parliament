"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Sparkles } from "lucide-react"
import { FeedCard, avatarColors, type FeedPost } from "@/components/shared/FeedCard"
import { ComposeTrigger } from "@/components/shared/ComposeTrigger"
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
} from "./actions"
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

// --- Data ---
export const MOCK_POSTS: FeedPost[] = [
  {
    id: "1",
    name: "Shubham Datarkar",
    headline: "Web Developer at TCS",
    batch: "21st batch (2006–2013)",
    location: "Nagpur, India",
    house: { name: "Shivaji", color: avatarColors.blue },
    membership: "associate",
    isVerified: true,
    timestamp: "2h",
    content: [
      "It's a reminder:",
      "Of early mornings, late nights,",
      "Near-falls and never-quits.",
      "This isn't a photo.",
      "It's proof that passion, when disciplined,",
      "doesn't just play — it wins.",
      "",
      "via @rahulsharma #Cricket #Sports",
    ].join("\n"),
    images: [
      "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=800&fit=crop",
    ],
    mediaCount: 4,
    upvotes: 56,
    downvotes: 12,
    comments: 55,
    shares: 3,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    borderType: "blue",
    memberSince: "2024",
    connections: 342,
    posts: 28,
  },
  {
    id: "2",
    name: "Neha Gupta",
    headline: "IAS Officer · Government of India",
    batch: "20th batch (2005–2012)",
    location: "Lucknow, India",
    house: { name: "Shivaji", color: avatarColors.gold },
    membership: "life",
    isVerified: true,
    isEdited: true,
    timestamp: "Edited 2h ago",
    question: "What if every decision you made was driven by empathy?",
    upvotes: 256,
    downvotes: 3,
    comments: 112,
    shares: 67,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    borderType: "gold",
    memberSince: "2021",
    connections: 1243,
    posts: 87,
  },
  {
    id: "3",
    name: "Priya Sharma",
    headline: "Software Engineer at Google",
    batch: "23rd batch (2008–2015)",
    location: "Bangalore, India",
    house: { name: "Tagore", color: avatarColors.darkBlue },
    membership: "premium",
    isVerified: true,
    timestamp: "4h",
    poll: {
      question: "Which tech stack should our alumni mentorship focus on?",
      options: [
        { id: "o1", label: "AI / Machine Learning", votes: 48 },
        { id: "o2", label: "Full Stack Web Development", votes: 28 },
        { id: "o3", label: "Cloud & DevOps", votes: 32 },
        { id: "o4", label: "Mobile App Development", votes: 12 },
      ],
      totalVotes: 120,
    },
    upvotes: 128,
    downvotes: 5,
    comments: 67,
    shares: 23,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    borderType: "darkBlue",
    memberSince: "2023",
    connections: 567,
    posts: 42,
  },
  {
    id: "4",
    name: "Dr. Amit Verma",
    headline: "Cardiologist · AIIMS Delhi",
    batch: "15th batch (2000–2007)",
    location: "Delhi, India",
    house: { name: "Raman", color: avatarColors.rgby },
    membership: "committee",
    isVerified: true,
    isPinned: true,
    timestamp: "1d",
    quote: {
      text: "The good physician treats the disease; the great physician treats the patient who has the disease. In JNV, we learned not just subjects, but humanity.",
      author: "Dr. William Osler",
      source: "The Principles and Practice of Medicine",
    },
    upvotes: 312,
    downvotes: 1,
    comments: 89,
    shares: 45,
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face",
    borderType: "rgby",
    memberSince: "2020",
    connections: 891,
    posts: 156,
  },
  {
    id: "5",
    name: "Rahul Mehta",
    headline: "Product Designer at Figma",
    batch: "24th batch (2009–2016)",
    location: "Mumbai, India",
    house: { name: "Tagore", color: avatarColors.green },
    membership: "student",
    isEdited: true,
    timestamp: "5 Aug 2025",
    content:
      "Building this project for NNAWCA with the confidence of a YouTube ad that says 'No experience required.'",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=800&fit=crop",
    videoDuration: "01:25",
    upvotes: 134,
    downvotes: 8,
    comments: 45,
    shares: 22,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    borderType: "green",
    memberSince: "2024",
    connections: 234,
    posts: 18,
  },
  {
    id: "6",
    name: "Vikram Singh",
    headline: "Founder & CEO · EduStart",
    batch: "18th batch (2003–2010)",
    location: "Pune, India",
    house: { name: "Raman", color: avatarColors.grey },
    membership: "inactive",
    isVerified: true,
    timestamp: "6h",
    content:
      "Just closed our Series A! Grateful to the JNV Nagpur alumni network for the early support and mentorship. To every Navodayan dreaming of building something — start today.\n\n#Startup #Entrepreneurship #JNVAlumni",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=800&fit=crop",
    upvotes: 445,
    downvotes: 2,
    comments: 156,
    shares: 89,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    borderType: "grey",
    memberSince: "2019",
    connections: 2100,
    posts: 312,
  },
]

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
  photoUrl: string
  headline: string
  batch: string
  house: string
}

function LeftSidebar({ userName, viewer }: { userName: string; viewer: ViewerCard | null }) {
  const name = viewer?.name ?? userName
  const photo =
    viewer?.photoUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
  return (
    <div className="space-y-3">
      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="h-[50px] bg-gradient-to-r from-brand to-brand-700" />
        <div className="px-4 pt-0 pb-3">
          <div className="text-center">
            <div className="avatar avatar-lg -mt-6 mb-2 mx-auto">
              <Image
                className="h-16 w-16 rounded-full border-2 border-white object-cover"
                src={photo}
                alt=""
                width={64}
                height={64}
              />
            </div>
            <h6 className="text-sm font-semibold text-gray-900 mb-0">
              <a href="/profile/edit" className="hover:text-brand transition-colors">{name}</a>
            </h6>
            <small className="text-xs text-gray-500">{viewer?.headline || "—"}</small>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="text-center">
                <h6 className="text-xs font-semibold text-gray-900 mb-0">{viewer?.batch ?? "—"}</h6>
                <small className="text-[10px] text-gray-500">Batch</small>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <h6 className="text-xs font-semibold text-gray-900 mb-0">{viewer?.house ?? "—"}</h6>
                <small className="text-[10px] text-gray-500">House</small>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 py-2 text-center">
          <a href="/profile/edit" className="text-xs font-medium text-brand hover:text-brand-600 transition-colors">Edit Profile</a>
          <span className="mx-2 text-gray-300">·</span>
          <a href="/saved" className="text-xs font-medium text-brand hover:text-brand-600 transition-colors">Saved</a>
        </div>
      </div>

    </div>
  )
}

// --- FeedContent ---
export function FeedContent({
  userName,
  viewer = null,
  viewerId = null,
  posts = MOCK_POSTS,
  initialHasMore = false,
  pageSize = 15,
  suggestions = [],
  news = [],
  initialEgged = [],
  loadedAt,
  activeTab = "forYou",
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
              <LeftSidebar userName={userName} viewer={viewer} />
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
            <ComposeTrigger />

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
              const isReal = post.id.length > 10 // real DB rows use UUIDs; mock rows use "1".."6"
              const isAuthor = !!(viewerId && post.authorId && viewerId === post.authorId)
              if (!isReal) {
                return <FeedCard key={post.id} post={post} />
              }

              function optimisticRemove() {
                setRemovedIds((s) => new Set(s).add(post.id))
              }

              return (
                <FeedCard
                  key={post.id}
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

            {/* Premium CTA */}
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
                    href="/directory"
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
