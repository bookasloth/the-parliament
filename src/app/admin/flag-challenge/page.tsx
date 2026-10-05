import { requireAdmin } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { listQueue } from "@/modules/games/flag-challenge"
import FlagChallengeClient, { type QueueRow } from "./flag-client"

export const dynamic = "force-dynamic"

export default async function AdminFlagChallengePage() {
  await requireAdmin()
  const schoolId = await getDefaultSchoolId()
  const rows = schoolId ? await listQueue(schoolId) : []
  const queue: QueueRow[] = rows.map((r) => ({
    id: r.id,
    code: r.countryCode,
    name: r.countryName,
    date: r.scheduledFor.toISOString().slice(0, 10),
    posted: r.postId != null,
    submissions: r.submissionCount,
  }))
  return <FlagChallengeClient queue={queue} />
}
