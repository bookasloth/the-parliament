"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { MediaGallery } from "@/components/shared/MediaGallery"
import {
  MoreHorizontal,
  Bookmark,
  Flag,
  BookmarkCheck,
  EyeOff,
  Ban,
  Trash2,
  Copy,
  Edit3,
  Send,
  Share2,
  MessageCircle,
} from "lucide-react"
import { useDropdown } from "./feed-card/use-dropdown"
import { TEXT_BG, type FeedPost } from "./feed-card/types"
import { VerifiedBadge, PollCard, RichText, MediaSection, QuoteBlock, HelpCircle } from "./feed-card/blocks"
import { ReactionBar } from "./feed-card/reaction-bar"
import CommentsSection from "@/app/(main)/feed/[postId]/comments-section"
import type { InlineComments } from "@/app/(main)/feed/actions"

// Public surface — kept stable so existing `@/components/shared/FeedCard` imports keep working.
export { avatarColors, TEXT_BG } from "./feed-card/types"
export type { FeedPost, BorderType, FeedMembership } from "./feed-card/types"
export { PollCard } from "./feed-card/blocks"
export { ReactionBar } from "./feed-card/reaction-bar"

// --- Feed Card (the standard post card used everywhere) ---
export function FeedCard({
  post,
  isAuthor = false,
  initialSaved = false,
  onUpvote,
  onDownvote,
  onComment,
  onShare,
  onAward,
  onSave,
  onDelete,
  onReport,
  onHide,
  onPollVote,
  onFollow,
  commentsLoader,
}: {
  post: FeedPost
  isAuthor?: boolean
  initialSaved?: boolean
  onUpvote?: () => void
  onDownvote?: () => void
  onComment?: (body: string) => void
  onShare?: () => void | Promise<unknown>
  onAward?: (awardKey: string) => Promise<{ ok: boolean; error?: string }> | void
  onSave?: () => Promise<{ saved: boolean }> | void
  onDelete?: () => void | Promise<unknown>
  onReport?: (reason: string) => void | Promise<unknown>
  onHide?: () => void | Promise<unknown>
  onPollVote?: (optionId: string) => void | Promise<unknown>
  /** Header follow CTA. When omitted the button still shows but only updates local state. */
  onFollow?: () => void | Promise<unknown>
  /** When set, the comment button expands the thread inline (lazy-loaded). */
  commentsLoader?: (postId: string) => Promise<InlineComments>
}) {
  const router = useRouter()
  const { open: actionOpen, setOpen: setActionOpen, ref: actionRef } = useDropdown()
  const [saved, setSaved] = useState(initialSaved)
  const [following, setFollowing] = useState(post.isFollowing ?? false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsData, setCommentsData] = useState<InlineComments | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)

  async function toggleComments() {
    const next = !commentsOpen
    setCommentsOpen(next)
    if (next && !commentsData && commentsLoader) {
      setLoadingComments(true)
      try {
        setCommentsData(await commentsLoader(post.id))
      } catch {
        // Leave closed-ish; user can tap again to retry.
        setCommentsData({ comments: [], count: post.comments, viewer: null })
      } finally {
        setLoadingComments(false)
      }
    }
  }

  function handleSave() {
    setActionOpen(false)
    setSaved((s) => !s)
    if (onSave) {
      Promise.resolve(onSave())
        .then((r) => {
          if (r && typeof r.saved === "boolean") setSaved(r.saved)
        })
        .catch(() => setSaved((s) => !s))
    }
  }

  function handleCopy() {
    setActionOpen(false)
    if (typeof window !== "undefined" && navigator?.clipboard) {
      const url = `${window.location.origin}/feed/${post.id}`
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  function shareUrl(): string {
    return typeof window !== "undefined" ? `${window.location.origin}/feed/${post.id}` : ""
  }
  function openShare(intent: "twitter" | "linkedin" | "whatsapp") {
    setActionOpen(false)
    if (typeof window === "undefined") return
    const url = encodeURIComponent(shareUrl())
    const text = encodeURIComponent(`${post.name} on NNAWCA Alumni Feed`)
    const target =
      intent === "twitter"
        ? `https://twitter.com/intent/tweet?url=${url}&text=${text}`
        : intent === "linkedin"
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        : `https://wa.me/?text=${text}%20${url}`
    window.open(target, "_blank", "noopener,noreferrer")
    onShare?.()
  }

  function handleDelete() {
    setActionOpen(false)
    if (!onDelete) return
    if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return
    void onDelete()
  }

  function handleFollow() {
    setFollowing(true)
    if (onFollow) Promise.resolve(onFollow()).catch(() => setFollowing(false))
  }

  function handleReport() {
    setActionOpen(false)
    if (!onReport) return
    const reason =
      typeof window !== "undefined"
        ? window.prompt("Why are you reporting this post?", "inappropriate")
        : null
    if (!reason) return
    void onReport(reason)
  }

  // Whole-card click → open the post, but only on "empty" areas. Any real
  // interactive target (button/link) or an active text selection is left alone.
  function handleCardClick(e: React.MouseEvent<HTMLDivElement>) {
    if (post.isSponsored) return
    if (e.target instanceof Element && e.target.closest("a,button,input,textarea,label,[role='button']")) return
    if (typeof window !== "undefined" && window.getSelection()?.toString()) return
    router.push(`/feed/${post.id}`)
  }

  // Profile link — sponsors go to their URL, alumni to /[username]; "#!" when unknown (anon/mock).
  const profileHref = post.isSponsored
    ? post.sponsorUrl ?? "#!"
    : post.username
    ? `/${post.username}`
    : "#!"
  const postHref = `/feed/${post.id}`

  type ActionItem = { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean }
  const shareItems: ActionItem[] = [
    { icon: <Share2 className="h-4 w-4" />, label: "Share to X", onClick: () => openShare("twitter") },
    { icon: <Send className="h-4 w-4" />, label: "Share to LinkedIn", onClick: () => openShare("linkedin") },
    { icon: <MessageCircle className="h-4 w-4" />, label: "Share to WhatsApp", onClick: () => openShare("whatsapp") },
    { icon: <Copy className="h-4 w-4" />, label: "Copy link", onClick: handleCopy },
  ]
  const actionItems: ActionItem[] = post.isSponsored
    ? [{ icon: <Flag className="h-4 w-4" />, label: "Report Ad", onClick: handleReport }]
    : isAuthor
    ? [
        {
          icon: saved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />,
          label: saved ? "Saved" : "Bookmark It",
          onClick: handleSave,
        },
        ...shareItems,
        {
          icon: <Edit3 className="h-4 w-4" />,
          label: "Edit post",
          onClick: () => {
            setActionOpen(false)
            if (typeof window !== "undefined") window.location.href = `/feed/${post.id}/edit`
          },
        },
        { icon: <Trash2 className="h-4 w-4" />, label: "Delete", onClick: handleDelete, danger: true },
      ]
    : [
        {
          icon: saved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />,
          label: saved ? "Saved" : "Bookmark It",
          onClick: handleSave,
        },
        {
          icon: <EyeOff className="h-4 w-4" />,
          label: "Hide It",
          onClick: onHide ? () => { setActionOpen(false); void onHide() } : undefined,
        },
        ...shareItems,
        { icon: <Ban className="h-4 w-4" />, label: "Block Them" },
        { icon: <Flag className="h-4 w-4" />, label: "Report It", onClick: handleReport, danger: true },
      ]

  return (
    <div
      onClick={post.isSponsored ? undefined : handleCardClick}
      className={`bg-white border border-[#E5E7EB] rounded-[6px] transition-shadow hover:shadow-card${
        post.isSponsored ? "" : " cursor-pointer"
      }`}
    >
      {/* Card Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <a href={profileHref} className="flex-shrink-0">
              <Image
                src={post.avatar}
                alt={post.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
              />
            </a>
            {/* Info */}
            <div>
              <div className="flex items-center gap-1.5">
                <h6 className="text-[16px] font-semibold text-gray-900 mb-0">
                  <a href={profileHref} className="hover:text-brand transition-colors">
                    {post.isSponsored ? post.sponsorName : post.name}
                  </a>
                </h6>
                {!post.isSponsored && post.isVerified && <VerifiedBadge membership={post.membership} />}
                {post.isSponsored && <span className="text-xs text-gray-500">Sponsored</span>}
                {!post.isSponsored && post.connectionDegree && (
                  <span className="text-xs text-[#6B7280]">· {post.connectionDegree}</span>
                )}
                {post.isSponsored ? (
                  <span className="text-xs text-[#6B7280] whitespace-nowrap">
                    {post.timestamp}
                    {post.isEdited && <span> · Edited</span>}
                  </span>
                ) : (
                  <a
                    href={postHref}
                    className="text-xs text-[#6B7280] whitespace-nowrap hover:underline"
                  >
                    {post.timestamp}
                    {post.isEdited && <span> · Edited</span>}
                  </a>
                )}
              </div>
              {/* Alumni graph context — "21st batch (2006 - 2013)" */}
              {!post.isSponsored && post.batch && (
                <div className="-mt-0.5 text-[12px] text-gray-500 leading-tight">{post.batch}</div>
              )}
            </div>
          </div>
          {/* Right cluster — Follow/Message · overflow */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!post.isSponsored && !isAuthor && (
              following ? (
                <a
                  href="/messages"
                  className="text-[13px] font-semibold text-brand hover:underline whitespace-nowrap"
                >
                  Message
                </a>
              ) : (
                <button
                  onClick={handleFollow}
                  className="text-[13px] font-semibold text-brand hover:underline whitespace-nowrap"
                >
                  Follow
                </button>
              )
            )}
          {/* Overflow Menu */}
          <div className="relative" ref={actionRef}>
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {actionOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg">
                {actionItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick ?? (() => setActionOpen(false))}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 ${
                      item.danger ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    <span className="w-4 flex-shrink-0">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 pt-2 pb-1">
        {post.content && !post.isSponsored && !post.quote && !post.question && !post.poll && (
          post.textBg && TEXT_BG[post.textBg] ? (
            <div
              className="flex min-h-[180px] items-center justify-center rounded-lg p-6"
              style={{ background: TEXT_BG[post.textBg].bg }}
            >
              <p
                className="whitespace-pre-line text-center text-xl font-bold leading-snug text-white"
                style={TEXT_BG[post.textBg].fg ? { color: TEXT_BG[post.textBg].fg } : undefined}
              >
                {post.content}
              </p>
            </div>
          ) : (
            <RichText text={post.content} collapsible />
          )
        )}

        {post.isSponsored && (
          <div>
            <p className="text-sm text-gray-700 leading-relaxed">{post.sponsorTagline}</p>
            <p className="text-sm text-gray-700 mt-1">{post.content}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">Trusted by 100+ Clients</p>
              <a
                href={post.sponsorUrl}
                target="_blank"
                className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Get Quote
              </a>
            </div>
          </div>
        )}

        {post.poll && <PollCard poll={post.poll} onVote={onPollVote} />}

        {post.quote && <QuoteBlock quote={post.quote} />}

        {post.question && (
          <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-brand to-brand-700 min-h-[140px] flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]" />
            <div className="absolute top-3 right-3 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Question
            </div>
            <h2 className="relative px-6 text-center text-lg md:text-xl font-bold leading-snug text-white">
              {post.question}
            </h2>
          </div>
        )}

        {post.mediaItems && post.mediaItems.length > 0 && !post.isSponsored ? (
          <MediaGallery items={post.mediaItems} />
        ) : post.images && !post.isSponsored ? (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
            {post.images.map((img, i) => (
              <Image
                key={i}
                src={img}
                alt={`Photo ${i + 1}`}
                width={0}
                height={0}
                sizes="(max-width: 768px) 50vw, 300px"
                className="w-full h-48 object-cover"
              />
            ))}
          </div>
        ) : post.image && !post.isSponsored ? (
          <MediaSection
            image={post.image}
            mediaCount={post.mediaCount}
            videoDuration={post.videoDuration}
          />
        ) : null}
      </div>

      {/* Reaction Bar */}
      <div className="mx-4 mt-[15px] mb-[30px] py-0.5 border-t-[0.5px] border-b-[0.5px] border-[#bfbfc4]">
        <ReactionBar
          postId={post.id}
          initialUpvotes={post.upvotes}
          initialDownvotes={post.downvotes}
          initialVote={
            post.viewerReaction === "upvote" || post.viewerReaction === "like"
              ? "up"
              : post.viewerReaction === "downvote"
              ? "down"
              : null
          }
          comments={post.comments}
          shares={post.shares}
          // With commentsLoader: comment button expands the thread inline below.
          // Without it (mock posts): falls back to the built-in quick-reply box.
          onCommentClick={commentsLoader ? toggleComments : undefined}
          commentsExpanded={commentsOpen}
          onUpvote={onUpvote}
          onDownvote={onDownvote}
          onComment={onComment}
          onShare={onShare}
          onAward={onAward}
        />
      </div>

      {/* Inline comment thread (lazy-loaded on first open) */}
      {commentsOpen && commentsLoader && (
        loadingComments && !commentsData ? (
          // Known-empty post → no spinner, just say so instantly. Otherwise a
          // one-comment skeleton while the thread loads.
          post.comments > 0 ? (
            <div className="flex gap-3 px-5 py-4">
              <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2 py-0.5">
                <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 text-sm text-gray-400">No comments yet.</div>
          )
        ) : commentsData ? (
          <CommentsSection
            embedded
            postId={post.id}
            initialComments={commentsData.comments}
            initialCount={commentsData.count}
            viewer={commentsData.viewer}
          />
        ) : null
      )}
    </div>
  )
}
