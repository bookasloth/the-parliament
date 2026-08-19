import { requireAdmin } from "@/modules/auth/session"
import { EXECUTIVE } from "@/lib/committee"
import { getCommitteePhotos } from "@/modules/committee/photos"
import CommitteePhotosClient from "./committee-photos-client"

export const dynamic = "force-dynamic"

export default async function AdminCommitteePhotosPage() {
  await requireAdmin()
  const photos = await getCommitteePhotos()
  const members = EXECUTIVE.map((m) => ({ key: m.key ?? "", name: m.name, position: m.position, photo: m.key ? photos[m.key] ?? null : null }))
  return <CommitteePhotosClient members={members} />
}
