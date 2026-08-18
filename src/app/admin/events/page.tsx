import { requirePermission } from "@/lib/gate"
import { getAdminEventRows } from "@/modules/events/service"
import EventsClient from "./events-client"

export const dynamic = "force-dynamic"

export default async function AdminEventsPage() {
  await requirePermission("events:manage")
  const events = await getAdminEventRows()
  return <EventsClient events={events} />
}
