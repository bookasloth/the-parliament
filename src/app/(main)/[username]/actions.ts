"use server"

import { optionalUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { getFeed, type FeedCursor } from "@/modules/feed/query"
import { mapRowToFeedPost } from "@/app/(main)/feed/map-row"
import type { ProfileTimelinePost } from "./profile-view"

/**
 * Next page of a profile's timeline (recency, keyset-paginated). The cursor is
 * the last post the client already has; getFeed returns the following page with
 * no offset drift plus the cursor for the page after. `nextCursor: null` = end.
 */
export async function loadMoreProfilePostsAction(
  userId: string,
  cursor: FeedCursor,
  pageSize = 20,
): Promise<{ posts: ProfileTimelinePost[]; nextCursor: FeedCursor | null }> {
  const viewer = await optionalUser()
  const author = await prisma.user.findUnique({ where: { id: userId }, select: { schoolId: true } })
  if (!author?.schoolId) return { posts: [], nextCursor: null }

  const { rows, nextCursor } = await getFeed({
    schoolId: author.schoolId,
    authorId: userId,
    viewerId: viewer?.id,
    pageSize,
    rankerName: "recency",
    cursor,
    groupId: null,
  })

  const posts: ProfileTimelinePost[] = rows.map((r) => {
    const post = mapRowToFeedPost(r)
    return { post, isAuthor: viewer?.id === post.authorId, initialSaved: post.savedByViewer ?? false }
  })
  return { posts, nextCursor }
}
