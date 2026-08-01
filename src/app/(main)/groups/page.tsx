import { unstable_cache } from "next/cache"
import { optionalUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { listGroupsShared, myGroupIds } from "@/modules/groups/service"
import GroupsClient from "./groups-client"

export const dynamic = "force-dynamic"

// Shared group list is viewer-agnostic → cache it (member counts drift within
// the 120s window; the per-viewer isJoined flag is overlaid live below).
const getGroupsCached = unstable_cache(
  (schoolId: string) => listGroupsShared(schoolId),
  ["groups-list"],
  { tags: ["groups"], revalidate: 120 },
)

export default async function GroupsPage() {
  const [user, schoolId] = await Promise.all([optionalUser(), getDefaultSchoolId()])

  const shared = schoolId ? await getGroupsCached(schoolId) : []
  let groups = shared
  if (user?.id && shared.length) {
    const joined = await myGroupIds(user.id)
    groups = shared.map((g) => (joined.has(g.id) ? { ...g, isJoined: true } : g))
  }

  return <GroupsClient groups={groups} />
}
