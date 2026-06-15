import EventsClient, { MOCK_EVENTS } from "./events-client"
import { listEvents } from "@/modules/events/service"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"

export const dynamic = "force-dynamic"

export default async function EventsPage() {
  let real: Awaited<ReturnType<typeof listEvents>> = []
  try {
    const schoolId = await getDefaultSchoolId()
    if (schoolId) {
      const user = await optionalUser()
      real = await listEvents(schoolId, user?.id ?? null)
    }
  } catch {
    real = []
  }

  const events = [...real, ...MOCK_EVENTS]
  return <EventsClient events={events} />
}
