import { requireAdmin } from "@/modules/auth/session"
import { getAdminGroupRows } from "@/modules/groups/service"
import GroupsClient from "./groups-client"

export const dynamic = "force-dynamic"

export default async function AdminGroupsPage() {
  await requireAdmin()
  const groups = await getAdminGroupRows()
  return <GroupsClient groups={groups} />
}
