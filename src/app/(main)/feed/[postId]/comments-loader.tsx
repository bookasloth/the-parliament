import { listPostComments } from "@/modules/feed/query"
import CommentsSection, { type CommentView } from "./comments-section"
import { buildCommentViews } from "./comment-view"

interface Props {
  postId: string
  postAuthorId: string
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
export default async function CommentsLoader({ postId, postAuthorId, initialCount, viewer }: Props) {
  const rows = await listPostComments(postId, 100, viewer?.id)
  const initial: CommentView[] = buildCommentViews(rows, postAuthorId)

  return (
    <CommentsSection
      postId={postId}
      initialComments={initial}
      initialCount={Math.max(initialCount, initial.length)}
      viewer={viewer}
    />
  )
}
