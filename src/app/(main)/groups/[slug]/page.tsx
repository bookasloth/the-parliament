import { optionalUser } from "@/modules/auth/session"
import { getGroupById } from "@/modules/groups/service"
import GroupDetailClient, { type RealGroup } from "./group-detail-client"

export const dynamic = "force-dynamic"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await optionalUser()

  // slug === group id. If it resolves to a real group, pass it through;
  // otherwise fall back to the client's built-in mock.
  let realGroup: RealGroup | undefined
  try {
    const found = await getGroupById(slug, user?.id ?? null)
    if (found) {
      realGroup = {
        id: found.id,
        slug: found.slug,
        name: found.name,
        description: found.description,
        members: found.members,
        privacy: found.privacy,
        category: found.category,
        cover: found.cover,
        icon: found.icon,
        isJoined: found.isJoined,
        postsThisWeek: found.postsThisWeek,
      }
    }
  } catch {
    // Non-UUID slug (mock) or lookup failure → use mock.
  }

  return <GroupDetailClient realGroup={realGroup} />
}
