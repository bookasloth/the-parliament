import { optionalUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { listGroups } from "@/modules/groups/service"
import GroupsClient, { MOCK_GROUPS } from "./groups-client"

export const dynamic = "force-dynamic"

export default async function GroupsPage() {
  const user = await optionalUser()
  const schoolId = await getDefaultSchoolId()

  const real = schoolId ? await listGroups(schoolId, user?.id ?? null) : []
  const groups = [...real, ...MOCK_GROUPS]

  return <GroupsClient groups={groups} />
}
