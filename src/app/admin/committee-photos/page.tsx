import { requireAdmin } from "@/modules/auth/session"
import { EXECUTIVE } from "@/lib/committee"
import { getCommitteeOverrides, applyOverrides } from "@/modules/committee/photos"
import CommitteePhotosClient from "./committee-photos-client"

export const dynamic = "force-dynamic"

export default async function AdminCommitteePhotosPage() {
  await requireAdmin()
  const merged = applyOverrides(EXECUTIVE, await getCommitteeOverrides())
  const members = merged.map((m) => ({
    key: m.key ?? "",
    name: m.name,
    position: m.position,
    photo: m.photo ?? null,
    profileLink: m.profileLink ?? "",
  }))
  return <CommitteePhotosClient members={members} />
}
