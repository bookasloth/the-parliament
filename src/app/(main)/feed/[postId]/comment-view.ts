import type { listPostComments } from "@/modules/feed/query"
import { formatBatch } from "../map-row"
import type { CommentView } from "./comments-section"

// Shared mapping: DB comment rows → CommentView the client section renders.
// Used by both the post-detail CommentsLoader and the inline feed loader action.
type CommentRow = Awaited<ReturnType<typeof listPostComments>>[number]

function toView(
  r: CommentRow | CommentRow["replies"][number],
  postAuthorId: string,
): Omit<CommentView, "replies"> {
  const name = r.author.displayName || r.author.legalName
  return {
    id: r.id,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    score: r.likeCount,
    myReaction: r.myReaction,
    isAuthor: r.author.id === postAuthorId,
    author: {
      id: r.author.id,
      username: r.author.username,
      displayName: name,
      isVerified: r.author.isVerified,
      membershipStatus: r.author.membershipStatus,
      avatarUrl:
        r.author.profile?.photoUrl ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      headline: r.author.profile?.headline ?? null,
      batch: formatBatch(r.author.profile?.batch) ?? null,
    },
  }
}

export function buildCommentViews(
  rows: CommentRow[],
  postAuthorId: string,
): CommentView[] {
  return rows.map((r) => ({
    ...toView(r, postAuthorId),
    replies: r.replies.map((rep) => ({ ...toView(rep, postAuthorId), replies: [] })),
  }))
}
