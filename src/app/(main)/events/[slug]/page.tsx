import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowLeft, Calendar, MapPin, Video, Users, Star,
} from "lucide-react"
import { optionalUser } from "@/modules/auth/session"
import {
  getEventById, listEventAttendees, getFeedbackSummary, getMyFeedback, canLeaveFeedback,
} from "@/modules/events/service"
import EventRegister from "./event-register"
import AttendancePanel from "./attendance-panel"
import FeedbackSection from "./feedback-section"

export const dynamic = "force-dynamic"

function formatWhen(start: Date, end: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
  const startStr = start.toLocaleDateString("en-IN", opts)
  const timeStr = start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
  if (!end) return `${startStr} · ${timeStr}`
  const endStr = end.toLocaleDateString("en-IN", opts)
  if (startStr === endStr) {
    const endT = end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    return `${startStr} · ${timeStr} – ${endT}`
  }
  return `${startStr} – ${endStr}`
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const viewer = await optionalUser()

  const result = await getEventById(slug, viewer?.id ?? null).catch(() => null)
  if (!result) notFound()
  const { event, myStatus } = result

  const registered = myStatus === "going"
  const isInterested = myStatus === "maybe"
  const isHost = !!viewer && event.hostId === viewer.id
  // "Past" once it has ended (or started, if no end time).
  const isPast = (event.endsAt ?? event.startsAt) < new Date()

  const [attendees, feedback, myFeedback, feedbackEligible] = await Promise.all([
    isHost ? listEventAttendees(event.id) : Promise.resolve([]),
    isPast ? getFeedbackSummary(event.id) : Promise.resolve(null),
    isPast && viewer ? getMyFeedback(event.id, viewer.id) : Promise.resolve(null),
    isPast && viewer ? canLeaveFeedback(event.id, viewer.id) : Promise.resolve(false),
  ])

  const hostName = event.host.displayName || event.host.legalName
  const mode = event.mode === "online" ? "Virtual" : event.mode === "hybrid" ? "Hybrid" : "In-person"
  const ModeIcon = event.mode === "online" ? Video : MapPin

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-4">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      {event.bannerUrl && (
        <div className="relative w-full h-48 sm:h-64 overflow-hidden rounded-xl border border-gray-200">
          <Image
            src={event.bannerUrl}
            alt={event.title}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-0.5">
                {mode}
              </span>
              {event.isFeatured && (
                <span className="rounded-full bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-500" /> Featured
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              {event.title}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Hosted by{" "}
              <Link
                href={event.host.username ? `/${event.host.username}` : "#"}
                className="text-brand-700 font-medium hover:underline"
              >
                {hostName}
              </Link>
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-brand-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatWhen(event.startsAt, event.endsAt)}
                </p>
              </div>
            </div>
            {(event.venue || event.onlineUrl) && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <ModeIcon className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  {event.venue && (
                    <p className="text-sm font-semibold text-gray-900 break-words">{event.venue}</p>
                  )}
                  {event.onlineUrl && (
                    <a
                      href={event.onlineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-700 hover:underline break-all"
                    >
                      {event.onlineUrl}
                    </a>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-sm text-gray-900">
                <span className="font-semibold">{event._count.rsvps}</span>{" "}
                {event._count.rsvps === 1 ? "person" : "people"} attending
              </p>
            </div>
          </div>

          {event.description && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">About</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}

          {isHost && <AttendancePanel eventId={event.id} attendees={attendees} />}

          {isPast && feedback && (
            <FeedbackSection
              eventId={event.id}
              summary={feedback}
              mine={myFeedback}
              eligible={feedbackEligible}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 lg:sticky lg:top-4">
            <EventRegister
              eventId={event.id}
              priceInPaise={event.priceInPaise}
              registered={registered}
              interested={isInterested}
              isPast={isPast}
              loggedIn={!!viewer}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
