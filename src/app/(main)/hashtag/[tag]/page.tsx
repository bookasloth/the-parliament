import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Hash } from "lucide-react"
import { formatBatch, relativeTime } from "../../feed/map-row"
import type { FeedMembership, BorderType } from "@/components/shared/feed-card/types"
import { ProfileSidebarView, type SidebarViewer } from "@/components/shared/ProfileSidebarView"
import { TimewheelAdCard } from "@/components/shared/TimewheelAdCard"
import { SIDEBAR_NAV } from "@/config/sidebar-nav"
import { loadViewer } from "@/lib/viewer"
import HashtagFeed from "./hashtag-feed"

const BORDER_MAP: Record<string, BorderType> = {
  premium: "darkBlue", life: "gold", student: "green", associate: "blue", inactive: "grey", committee: "rgby",
}

const postSelect = {
  id: true, body: true, media: true, status: true, deletedAt: true,
  createdAt: true,
  upvoteCount: true, downvoteCount: true, commentCount: true, shareCount: true,
  author: {
    select: {
      id: true, username: true, legalName: true, displayName: true,
      isVerified: true, membershipStatus: true,
      profile: {
        select: {
          photoUrl: true,
          headline: true,
          house: { select: { name: true, colorHex: true } },
          batch: { select: { startYear: true, endYear: true, label: true } },
        },
      },
    },
  },
  poll: {
    select: {
      id: true, question: true, expiresAt: true,
      options: { select: { id: true, label: true, voteCount: true }, orderBy: { sortOrder: "asc" as const } },
    },
  },
} as const

export default async function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const normTag = tag.toLowerCase()
  const session = await auth()
  const viewerId = session?.user?.id

  const [hashtag, viewer] = await Promise.all([
    prisma.hashtag.findUnique({
      where: { tag: normTag },
      select: { id: true, tag: true, useCount: true },
    }),
    viewerId ? loadViewer(viewerId) : null,
  ])

  let rawPosts: any[]
  let useCount: number

  if (hashtag) {
    const rows = await prisma.postHashtag.findMany({
      where: { hashtagId: hashtag.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { post: { select: postSelect } },
    })
    rawPosts = rows.map((r) => (r as any).post)
    useCount = hashtag.useCount
  } else {
    const found = await prisma.post.findMany({
      where: {
        body: { contains: `#${normTag}`, mode: "insensitive" },
        status: "visible",
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: postSelect,
    })
    if (found.length === 0) notFound()
    rawPosts = found
    useCount = found.length
  }

  const posts = rawPosts
    .filter((pt) => pt && !pt.deletedAt && pt.status === "visible")
    .map((pt) => {
      const a = pt.author
      const ms = (["associate","student","premium","life","inactive","committee"].includes(a.membershipStatus)
        ? a.membershipStatus : "associate") as FeedMembership
      return {
        post: {
          id: pt.id,
          authorId: a.id,
          username: a.username ?? undefined,
          name: a.displayName || a.legalName,
          headline: a.profile?.headline ?? "",
          batch: formatBatch(a.profile?.batch),
          house: a.profile?.house ? { name: a.profile.house.name, color: a.profile.house.colorHex } : undefined,
          membership: ms,
          timestamp: relativeTime(pt.createdAt),
          isVerified: a.isVerified,
          content: pt.body ?? undefined,
          poll: pt.poll ? {
            id: pt.poll.id,
            question: pt.poll.question,
            options: pt.poll.options.map((o: { id: string; label: string; voteCount: number }) => ({ id: o.id, label: o.label, votes: o.voteCount })),
            totalVotes: pt.poll.options.reduce((s: number, o: { voteCount: number }) => s + o.voteCount, 0),
          } : undefined,
          upvotes: pt.upvoteCount,
          downvotes: pt.downvoteCount,
          comments: pt.commentCount,
          shares: pt.shareCount,
          avatar: a.profile?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(a.displayName || a.legalName)}`,
          borderType: BORDER_MAP[ms] ?? ("blue" as BorderType),
        },
        isAuthor: viewerId === a.id,
        initialSaved: false,
      }
    })

  const sidebarViewer: SidebarViewer | null = viewer
    ? {
        name: viewer.displayName || viewer.legalName,
        username: viewer.username,
        photoUrl: viewer.profile?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(viewer.displayName || viewer.legalName)}`,
        coverUrl: viewer.profile?.coverUrl ?? null,
        headline: viewer.profile?.headline ?? "",
        posts: viewer._count.posts,
        followers: viewer._count.followers,
        following: viewer._count.following,
      }
    : null

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <div className="hidden lg:block w-full lg:w-[280px] flex-shrink-0">
            <div className="sticky top-20">
              <ProfileSidebarView viewer={sidebarViewer} nav={SIDEBAR_NAV.feed} />
            </div>
          </div>

          {/* Main Column */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-3 rounded-[5px] border border-gray-200 bg-white px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-brand/10 text-brand">
                <Hash className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">#{normTag}</h1>
                <p className="text-xs text-gray-500">{useCount} {useCount === 1 ? "post" : "posts"}</p>
              </div>
            </div>
            <HashtagFeed posts={posts} />
          </div>

          {/* Right Sidebar */}
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
