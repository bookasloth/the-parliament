import { notFound } from "next/navigation"
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

  let found
  try {
    found = await getGroupById(slug, user?.id ?? null)
  } catch {
    notFound()
  }
  if (!found) notFound()

  const realGroup: RealGroup = {
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

  return <GroupDetailClient realGroup={realGroup} />
}
