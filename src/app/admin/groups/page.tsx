import { requirePermission } from "@/lib/gate"
import { getAdminGroupRows } from "@/modules/groups/service"
import GroupsClient from "./groups-client"

export const dynamic = "force-dynamic"

export default async function AdminGroupsPage() {
  await requirePermission("groups:manage")
  const groups = await getAdminGroupRows()
  return <GroupsClient groups={groups} />
}
