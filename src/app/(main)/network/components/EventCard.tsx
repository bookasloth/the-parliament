import Link from "next/link"
import { Calendar, MapPin, Users } from "lucide-react"
import type { NetworkEvent } from "../network-data"

export function EventCard({ event }: { event: NetworkEvent }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-card"
    >
      <div className="relative">
        <img src={event.cover} alt={event.title} loading="lazy" className="h-28 w-full object-cover" />
        <span className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold text-white ${event.isFree ? "bg-green-500" : "bg-brand"}`}>
          {event.isFree ? "Free" : `₹${event.price}`}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{event.title}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500"><Calendar className="h-3.5 w-3.5" /> {event.date}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500"><MapPin className="h-3.5 w-3.5" /> {event.location}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400"><Users className="h-3.5 w-3.5" /> {event.interested} interested</p>
        <span className="mt-3 rounded-md border border-brand bg-brand px-3 py-1.5 text-center text-sm font-medium text-white transition-colors hover:bg-white hover:text-brand">
          Register
        </span>
      </div>
    </Link>
  )
}
