import { redirect } from "next/navigation"
import { optionalUser } from "@/modules/auth/session"
import { listSavedPosts } from "@/modules/feed/query"
import { prisma } from "@/lib/prisma"
import { mapRowToFeedPost } from "../feed/map-row"
import SavedFeed from "./saved-feed"

export const dynamic = "force-dynamic"

export default async function SavedPage() {
  const viewer = await optionalUser()
  if (!viewer?.id) redirect("/auth/signin?callbackUrl=/saved")

  const rows = await listSavedPosts(viewer.id, 50)
  const followingIds = new Set(
    (await prisma.follow.findMany({ where: { followerId: viewer.id }, select: { followingId: true } })).map(
      (f) => f.followingId,
    ),
  )
  const posts = rows.map((r) => mapRowToFeedPost(r, followingIds))

  return (
    <div className="mx-auto max-w-[680px] px-4 sm:px-6 py-6">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Saved posts</h1>
      <SavedFeed posts={posts} viewerId={viewer.id} />
    </div>
  )
}
