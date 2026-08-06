import { unstable_cache } from "next/cache"
import EventsClient from "./events-client"
import { listEventsShared, myInterestedEventIds } from "@/modules/events/service"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
import { getSidebarViewer } from "@/components/shared/ProfileSidebar"
import type { SidebarViewer } from "@/components/shared/ProfileSidebarView"

export const dynamic = "force-dynamic"

// Shared event list is viewer-agnostic (RSVPs don't affect it) → cache it.
// The per-viewer "interested" flag is overlaid live below.
const getEventsCached = unstable_cache(
  (schoolId: string) => listEventsShared(schoolId),
  ["events-list"],
  { tags: ["events"], revalidate: 120 },
)

export default async function EventsPage() {
  let events: Awaited<ReturnType<typeof listEventsShared>> = []
  let sidebarViewer: SidebarViewer | null = null
  try {
    const [schoolId, user, sv] = await Promise.all([
      getDefaultSchoolId(),
      optionalUser(),
      getSidebarViewer(),
    ])
    sidebarViewer = sv
    if (schoolId) {
      const shared = await getEventsCached(schoolId)
      if (user?.id) {
        const going = await myInterestedEventIds(user.id)
        events = shared.map((e) => (going.has(e.id) ? { ...e, interested: true } : e))
      } else {
        events = shared
      }
    }
  } catch {
    events = []
  }

  return <EventsClient events={events} sidebarViewer={sidebarViewer} />
}
