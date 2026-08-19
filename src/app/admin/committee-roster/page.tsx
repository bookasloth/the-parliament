import { requireAdmin } from "@/modules/auth/session"
import { listRosterAdmin } from "@/modules/committee/roster"
import CommitteeRosterClient from "./committee-roster-client"

export const dynamic = "force-dynamic"

export default async function AdminCommitteeRosterPage() {
  await requireAdmin()
  const members = await listRosterAdmin()
  return <CommitteeRosterClient initialMembers={members} />
}
