import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft, BarChart2, Edit3, ShieldCheck } from "lucide-react"
import { optionalUser } from "@/modules/auth/session"
import { getPostById } from "@/modules/feed/query"
import {
  awardPostAction,
  deletePostAction,
  reactToPost,
  reportPostAction,
  sharePostAction,
  toggleSavePostAction,
} from "../actions"
import { prisma } from "@/lib/prisma"
import PostReactionBar from "./post-reaction-bar"
import PollBlock from "./poll-block"
import CommentsLoader from "./comments-loader"
import { TEXT_BG } from "@/components/shared/FeedCard"
import { CommentsSkeleton } from "@/components/shared/feed-skeletons"

export const dynamic = "force-dynamic"

function relativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

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

  const author = post.author
  const authorName = author.displayName || author.legalName
  const avatar =
    author.profile?.photoUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}`
  const isAuthor = viewer?.id === author.id

  const savedRow = viewer?.id
    ? await prisma.savedPost.findUnique({
        where: { userId_postId: { userId: viewer.id, postId: post.id } },
        select: { userId: true },
      })
    : null
  const initialSaved = !!savedRow

  const viewerForComments = viewer
    ? await prisma.user
        .findUnique({
          where: { id: viewer.id },
          select: {
            id: true,
            displayName: true,
            legalName: true,
            profile: { select: { photoUrl: true } },
          },
        })
        .then((u) => {
          if (!u) return null
          const name = u.displayName || u.legalName
          return {
            id: u.id,
            displayName: name,
            avatarUrl:
              u.profile?.photoUrl ??
              `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          }
        })
    : null

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>

      <article className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={author.username ? `/${author.username}` : "#"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt={authorName}
                className="h-12 w-12 rounded-full object-cover border border-gray-200"
              />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={author.username ? `/${author.username}` : "#"}
                  className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                >
                  {authorName}
                </Link>
                {author.isVerified && (
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-100" />
                )}
              </div>
              {author.profile?.headline && (
                <p className="text-xs text-gray-500 mt-0.5">{author.profile.headline}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {relativeTime(post.createdAt)}
                {post.isEdited && " · edited"}
              </p>
            </div>
          </div>
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
        </header>

        {post.body && !post.poll && (() => {
          const bgId = Array.isArray(post.media)
            ? (post.media as { type?: string; bg?: string }[]).find((m) => m?.type === "style")?.bg
            : undefined
          const bg = bgId ? TEXT_BG[bgId] : undefined
          return (
            <div className="px-5 pb-3">
              {bg ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-lg p-6" style={{ background: bg.bg }}>
                  <p className="whitespace-pre-line text-center text-xl font-bold leading-snug text-white" style={bg.fg ? { color: bg.fg } : undefined}>
                    {post.body}
                  </p>
                </div>
              ) : (
                <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-line">{post.body}</p>
              )}
            </div>
          )
        })()}

        {post.poll && (
          <div className="px-5 pb-3">
            <PollBlock
              postId={post.id}
              poll={{
                id: post.poll.id,
                question: post.poll.question,
                options: post.poll.options.map((o) => ({ id: o.id, label: o.label, votes: o.voteCount })),
                totalVotes: post.poll.totalVotes,
                myOptionId: post.poll.votes?.[0]?.optionId ?? null,
                isClosed: post.poll.expiresAt ? new Date(post.poll.expiresAt) < new Date() : false,
              }}
            />
          </div>
        )}

        {post.linkUrl && (
          <div className="px-5 pb-3">
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 break-all"
            >
              {post.linkUrl}
            </a>
          </div>
        )}

        {Array.isArray(post.media) && post.media.length > 0 && (
          <div className={`grid gap-0.5 ${post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {(post.media as { key: string; type: string; url?: string }[]).map((m, i) =>
              m.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={m.url}
                  alt=""
                  className="w-full h-64 object-cover"
                />
              ) : null,
            )}
          </div>
        )}

        <PostReactionBar
          postId={post.id}
          isAuthor={isAuthor}
          initialSaved={initialSaved}
          initial={{
            upvotes: post.upvoteCount,
            downvotes: post.downvoteCount,
            comments: post.commentCount,
            shares: post.shareCount,
            viewerReaction: viewerReaction as "upvote" | "downvote" | "like" | null,
          }}
          reactAction={reactToPost}
          shareAction={sharePostAction}
          saveAction={toggleSavePostAction}
          awardAction={
            !isAuthor
              ? (id, key) => awardPostAction(id, key as never)
              : undefined
          }
          reportAction={!isAuthor ? reportPostAction : undefined}
          deleteAction={isAuthor ? deletePostAction : undefined}
        />
      </article>

      <Suspense
        fallback={
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
            </div>
            <CommentsSkeleton count={3} />
          </div>
        }
      >
        <CommentsLoader
          postId={post.id}
          postAuthorId={author.id}
          initialCount={post.commentCount}
          viewer={viewerForComments}
        />
      </Suspense>
    </div>
  )
}
