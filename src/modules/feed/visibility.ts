import { Prisma } from "@/generated/prisma/client"
import { HIDDEN_AUTHOR_STATUSES } from "@/lib/account-status"

// Pure builders for the post-visibility where-clauses, extracted so the audience
// rules live in one tested place instead of being re-derived per read path
// (audit SP-2: "visibility re-implemented 4× with 4 answers"). No DB access —
// callers pass the already-fetched follow set.

/**
 * Author-relation filter that hides posts/comments by suspended/banned authors
 * from EVERY viewer (audit CP0-2 — moderation blocked the actor but left their
 * content live). Self-deactivated (`inactive`) content stays visible.
 * AND into a query as `author: { is: visibleAuthorWhere() }` (or spread into a
 * larger author filter), or into a to-one relation filter that already scopes by
 * the author.
 */
export function visibleAuthorWhere(): Prisma.UserWhereInput {
  return { status: { notIn: [...HIDDEN_AUTHOR_STATUSES] } }
}

/**
 * The "followers"-scope audience gate for a POST list (audit CP0-1). Returns a
 * `Prisma.PostWhereInput` fragment to AND into the query, or `null` when no
 * restriction applies. Feed AND profile-timeline callers use it identically —
 * the profile branch previously skipped scoping entirely, leaking followers-only
 * posts (and, when logged out, to the public web).
 *
 * - viewing your own timeline → `null` (you see all your own posts)
 * - logged-in viewer          → public-scope OR authored by someone you follow / yourself
 * - logged-out viewer         → public-scope only (followers-only posts hidden)
 *
 * ponytail: `groups`-scope is treated as public here; group-feed enforcement
 * lives in the groups module and the profile timeline passes `groupId: null`.
 */
/**
 * Whether the ORIGINAL embedded in a repost must be hidden from this viewer
 * (audit repost-as-object). A hidden original renders as a tombstone instead of
 * leaking its content: it's deleted/removed, its author is suspended/banned, the
 * viewer is in a block relationship with the author, or it's followers-only and
 * the viewer neither authored it nor follows the author. Pure — the caller passes
 * the viewer's already-fetched follow/block sets.
 */
export function isRepostOriginalHidden(
  original: {
    deletedAt: Date | null
    status: string
    visibilityScope: string
    authorId: string
    author: { status: string }
  },
  viewer: { viewerId?: string; followingIds: Set<string>; blockedIds: Set<string> },
): boolean {
  if (original.deletedAt || original.status !== "visible") return true
  if (original.author.status === "suspended" || original.author.status === "banned") return true
  if (viewer.blockedIds.has(original.authorId)) return true
  if (
    original.visibilityScope === "followers" &&
    original.authorId !== viewer.viewerId &&
    !viewer.followingIds.has(original.authorId)
  )
    return true
  return false
}

export function followersAudienceWhere(opts: {
  viewerId?: string
  followingIds: Iterable<string>
  viewingOwnTimeline: boolean
}): Prisma.PostWhereInput | null {
  if (opts.viewingOwnTimeline) return null
  if (!opts.viewerId) return { visibilityScope: { not: "followers" } }
  return {
    OR: [
      { visibilityScope: { not: "followers" } },
      { authorId: { in: [...opts.followingIds, opts.viewerId] } },
    ],
  }
}
