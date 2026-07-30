import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BarChart2, Edit3, ShieldCheck } from "lucide-react"
import { optionalUser, requireUser } from "@/modules/auth/session"
import { getPostById, listPostComments } from "@/modules/feed/query"
import {
  awardPostAction,
  commentOnPost,
  deletePostAction,
  reactToPost,
  reportPostAction,
  sharePostAction,
  toggleSavePostAction,
} from "../actions"
import { prisma } from "@/lib/prisma"
import PostReactionBar from "./post-reaction-bar"

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

  const comments = await listPostComments(post.id, 100)
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

  async function submitComment(formData: FormData) {
    "use server"
    await requireUser()
    const body = String(formData.get("body") ?? "").trim()
    if (!body) return
    await commentOnPost(post.id, body)
  }

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

        {post.body && (
          <div className="px-5 pb-3">
            <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-line">
              {post.body}
            </p>
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

      <section className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
          </h2>
        </div>

        {viewer && (
          <form action={submitComment} className="px-5 py-3 border-b border-gray-100 flex gap-3">
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Write a comment…"
              className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              type="submit"
              className="self-end rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Post
            </button>
          </form>
        )}

        <ul className="divide-y divide-gray-100">
          {comments.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-gray-400">
              No comments yet.
            </li>
          ) : (
            comments.map((c) => {
              const cname = c.author.displayName || c.author.legalName
              const cavatar =
                c.author.profile?.photoUrl ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(cname)}`
              return (
                <li key={c.id} className="px-5 py-4 flex gap-3">
                  <Link
                    href={c.author.username ? `/${c.author.username}` : "#"}
                    className="flex-shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cavatar}
                      alt={cname}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{cname}</span>
                        {c.author.isVerified && (
                          <ShieldCheck className="h-3 w-3 text-blue-500 fill-blue-100" />
                        )}
                      </div>
                      {c.author.profile?.headline && (
                        <p className="text-xs text-gray-500 mb-1">{c.author.profile.headline}</p>
                      )}
                      <p className="text-sm text-gray-700 whitespace-pre-line">{c.body}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{relativeTime(c.createdAt)}</p>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </section>
    </div>
  )
}
