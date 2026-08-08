import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Hash } from "lucide-react"
import { formatBatch, relativeTime } from "../../feed/map-row"
import type { FeedMembership, BorderType } from "@/components/shared/feed-card/types"
import HashtagFeed from "./hashtag-feed"

const BORDER_MAP: Record<string, BorderType> = {
  premium: "darkBlue", life: "gold", student: "green", associate: "blue", inactive: "grey", committee: "rgby",
}

export default async function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const normTag = tag.toLowerCase()
  const session = await auth()
  const viewerId = session?.user?.id

  const hashtag = await prisma.hashtag.findUnique({
    where: { tag: normTag },
    select: { id: true, tag: true, useCount: true },
  })

  if (!hashtag) notFound()

  const rows = await prisma.postHashtag.findMany({
    where: { hashtagId: hashtag.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      post: {
        select: {
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
              options: { select: { id: true, label: true, voteCount: true }, orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  })

  const posts = (rows as any[])
    .filter((r) => r.post && !r.post.deletedAt && r.post.status === "visible")
    .map((r) => {
      const pt = r.post
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

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-brand/10 text-brand">
          <Hash className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">#{hashtag.tag}</h1>
          <p className="text-sm text-gray-500">{hashtag.useCount} {hashtag.useCount === 1 ? "post" : "posts"}</p>
        </div>
      </div>
      <HashtagFeed posts={posts} />
    </div>
  )
}
