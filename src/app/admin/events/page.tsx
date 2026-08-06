import { requireAdmin } from "@/modules/auth/session"
import { getAdminEventRows } from "@/modules/events/service"
import EventsClient from "./events-client"

export const dynamic = "force-dynamic"

export default async function AdminEventsPage() {
  await requireAdmin()
  const events = await getAdminEventRows()
  return <EventsClient events={events} />
}
