import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, Share2, Eye, Users, Activity, UserPlus,
} from "lucide-react"
import { requireUser } from "@/modules/auth/session"
import { getPostById } from "@/modules/feed/query"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// ponytail: reach / interactions / navigation aren't tracked yet — sample
// figures so the insights layout reads as designed. Swap for real impression
// data when an impressions table lands.
const SAMPLE = { reached: 380, interactions: 48, profileVisits: 1, follows: 0 }

export default async function PostAnalyticsPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const user = await requireUser()

  const result = await getPostById(postId, user.id).catch(() => null)
  if (!result) notFound()
  const { post } = result
  if (post.author.id !== user.id) notFound()

  const topCommenters = await prisma.comment.groupBy({
    by: ["authorId"],
    where: { postId, deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { authorId: "desc" } },
    take: 6,
  })

  const commenterProfiles = topCommenters.length
    ? await prisma.user.findMany({
        where: { id: { in: topCommenters.map((c) => c.authorId) } },
        select: {
          id: true,
          username: true,
          displayName: true,
          legalName: true,
          profile: { select: { photoUrl: true } },
        },
      })
    : []
  const profileMap = new Map(commenterProfiles.map((p) => [p.id, p]))

  const totalReactions = post.upvoteCount + post.downvoteCount
  const upvotePct = totalReactions === 0 ? 0 : Math.round((post.upvoteCount / totalReactions) * 100)

  // 4 × 2 grid — icon + number. Upvotes/downvotes/comments/shares are real;
  // reach/interactions/profile visits/follows are sample (see SAMPLE above).
  const stats: { label: string; value: number; icon: React.ReactNode; color: string; bg: string }[] = [
    { label: "Views", value: post.viewCount, icon: <Eye className="h-5 w-5" />, color: "text-sky-600", bg: "bg-sky-50" },
    { label: "Accounts reached", value: SAMPLE.reached, icon: <Users className="h-5 w-5" />, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Upvotes", value: post.upvoteCount, icon: <ThumbsUp className="h-5 w-5" />, color: "text-brand-700", bg: "bg-brand-50" },
    { label: "Downvotes", value: post.downvoteCount, icon: <ThumbsDown className="h-5 w-5" />, color: "text-red-500", bg: "bg-red-50" },
    { label: "Comments", value: post.commentCount, icon: <MessageCircle className="h-5 w-5" />, color: "text-green-600", bg: "bg-green-50" },
    { label: "Shares", value: post.shareCount, icon: <Share2 className="h-5 w-5" />, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Interactions", value: SAMPLE.interactions, icon: <Activity className="h-5 w-5" />, color: "text-pink-500", bg: "bg-pink-50" },
    { label: "Profile visits", value: SAMPLE.profileVisits, icon: <UserPlus className="h-5 w-5" />, color: "text-indigo-500", bg: "bg-indigo-50" },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-5">
      <Link
        href={`/feed/${post.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to post
      </Link>

      {/* 4 × 2 stat grid — horizontal cards: icon + number */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className={`inline-flex rounded-lg p-2 ${s.bg} ${s.color}`}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-1 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {totalReactions > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Upvote vs downvote</h3>
          <div className="h-3 rounded-full overflow-hidden flex bg-red-100">
            <div className="bg-brand-600" style={{ width: `${upvotePct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs">
            <span className="text-brand-700 font-medium">{post.upvoteCount} upvotes ({upvotePct}%)</span>
            <span className="text-red-500 font-medium">{post.downvoteCount} downvotes ({100 - upvotePct}%)</span>
          </div>
        </div>
      )}

      {/* Top commenters — small cards: photo · name · comment count */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Top commenters</h3>
        {topCommenters.length === 0 ? (
          <p className="text-sm text-gray-400">No comments yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topCommenters.map((tc) => {
              const u = profileMap.get(tc.authorId)
              const name = u?.displayName || u?.legalName || "Unknown"
              const avatar =
                u?.profile?.photoUrl ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
              return (
                <Link
                  key={tc.authorId}
                  href={u?.username ? `/${u.username}` : "#"}
                  className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2.5 hover:border-brand-300 transition-colors"
                >
                  <Image src={avatar} alt={name} className="h-9 w-9 rounded-full object-cover flex-shrink-0" width={36} height={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-500">
                      {tc._count._all} {tc._count._all === 1 ? "comment" : "comments"}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
