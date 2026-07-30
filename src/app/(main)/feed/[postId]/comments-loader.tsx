import { listPostComments } from "@/modules/feed/query"
import CommentsSection, { type CommentView } from "./comments-section"

interface Props {
  postId: string
  initialCount: number
  viewer: null | {
    id: string
    displayName: string
    avatarUrl: string
  }
}

// Server component that fetches comments, then hands to the client
// section which owns optimistic append + form. Wrap in <Suspense> to
// let the post + reactions render first while comments stream in.
type CommentRow = Awaited<ReturnType<typeof listPostComments>>[number]

function toView(r: CommentRow | CommentRow["replies"][number]): Omit<CommentView, "replies"> {
  const name = r.author.displayName || r.author.legalName
  return {
    id: r.id,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    author: {
      id: r.author.id,
      username: r.author.username,
      displayName: name,
      isVerified: r.author.isVerified,
      avatarUrl:
        r.author.profile?.photoUrl ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      headline: r.author.profile?.headline ?? null,
    },
  }
}

export default async function CommentsLoader({ postId, initialCount, viewer }: Props) {
  const rows = await listPostComments(postId, 100)
  const initial: CommentView[] = rows.map((r) => ({
    ...toView(r),
    replies: r.replies.map((rep) => ({ ...toView(rep), replies: [] })),
  }))

  return (
    <CommentsSection
      postId={postId}
      initialComments={initial}
      initialCount={Math.max(initialCount, initial.length)}
      viewer={viewer}
    />
  )
}
