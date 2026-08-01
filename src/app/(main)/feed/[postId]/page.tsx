import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BarChart2, Edit3 } from "lucide-react"
import { optionalUser } from "@/modules/auth/session"
import { getPostById } from "@/modules/feed/query"
import { prisma } from "@/lib/prisma"
import { mapRowToFeedPost } from "../map-row"
import PostCard from "./post-card"

export const dynamic = "force-dynamic"

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const viewer = await optionalUser()

  const result = await getPostById(postId, viewer?.id).catch(() => null)
  if (!result) notFound()
  const { post, viewerReaction } = result

  // Count the view (ponytail: increments on every open, incl. author/refresh —
  // good enough for a view counter; dedupe with an impressions table if needed).
  await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  const isAuthor = viewer?.id === post.author.id
  const feedPost = mapRowToFeedPost({ ...post, viewerReaction })

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
        {isAuthor && (
          <div className="flex items-center gap-1">
            <Link
              href={`/feed/${post.id}/edit`}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
            <Link
              href={`/feed/${post.id}/analytics`}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              <BarChart2 className="h-3.5 w-3.5" /> Analytics
            </Link>
          </div>
        )}
      </div>

      <PostCard post={feedPost} isAuthor={isAuthor} initialSaved={feedPost.savedByViewer ?? false} />
    </div>
  )
}
