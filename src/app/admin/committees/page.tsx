import { requireAdmin } from "@/modules/auth/session"
import { listCommitteeMembers } from "@/modules/committees/service"
import CommitteesClient, { type MemberRow } from "./committees-client"

export default async function AdminCommitteesPage() {
  await requireAdmin()
  const members = await listCommitteeMembers()
  const rows: MemberRow[] = members.map((m) => ({
    id: m.id,
    committee: m.committee,
    email: m.email,
    name: m.name,
    role: m.role,
  }))
  return <CommitteesClient members={rows} />
}
