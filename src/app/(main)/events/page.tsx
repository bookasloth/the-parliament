"use client"

import { useState } from "react"
import {
  Search, Plus, Calendar, MapPin, Users, Clock, ChevronRight,
  Home, Menu, X, Filter, Video, Building2, Globe,
  Star, TrendingUp, Ticket, Bell,
} from "lucide-react"

type EventType = "all" | "upcoming" | "past" | "mine"
type EventMode = "all" | "virtual" | "in-person" | "hybrid"

interface Event {
  id: string
  slug: string
  title: string
  description: string
  date: string
  time: string
  location: string
  mode: "virtual" | "in-person" | "hybrid"
  organizer: string
  organizerAvatar: string
  cover: string
  attending: number
  interested: number
  isFree: boolean
  price?: number
  myRsvp?: "attending" | "interested" | null
  isPast?: boolean
  isFeatured?: boolean
  category: string
}

const events: Event[] = [
  { id: "1", slug: "alumni-reunion-2026", title: "JNV Nagpur Alumni Reunion 2026", description: "The grand annual reunion of all JNV Nagpur alumni. Two days of nostalgia, networking, and fun at our beloved campus.", date: "Oct 15–16, 2026", time: "10:00 AM", location: "JNV Nagpur Campus, Navegaon Khairi", mode: "in-person", organizer: "NNAWCA", organizerAvatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face", cover: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop", attending: 287, interested: 512, isFree: false, price: 500, myRsvp: "interested", isFeatured: true, category: "Reunion" },
  { id: "2", slug: "tech-talk-ai-careers", title: "Tech Talk: AI & Careers in 2026", description: "A virtual session with Navodayan techies working at top AI companies. Q&A and career guidance included.", date: "Jul 5, 2026", time: "7:00 PM IST", location: "Zoom Webinar", mode: "virtual", organizer: "Tech Navodayans Group", organizerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop", attending: 89, interested: 234, isFree: true, myRsvp: "attending", category: "Webinar" },
  { id: "3", slug: "nagpur-chapter-meetup-july", title: "Nagpur Chapter Meetup – July 2026", description: "Monthly meetup for Nagpur-based alumni. Casual dinner, great conversations.", date: "Jul 20, 2026", time: "7:30 PM", location: "Nagpur Club, Civil Lines", mode: "in-person", organizer: "Nagpur Chapter", organizerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", cover: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop", attending: 34, interested: 56, isFree: true, myRsvp: null, category: "Meetup" },
  { id: "4", slug: "startup-showcase-2026", title: "Navodayan Startup Showcase", description: "Alumni entrepreneurs pitch their startups. Network with investors and fellow founders from JNV Nagpur.", date: "Aug 3, 2026", time: "2:00 PM IST", location: "Google Meet + In-Person (Pune)", mode: "hybrid", organizer: "Navodayan Entrepreneurs Group", organizerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", cover: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=400&fit=crop", attending: 54, interested: 128, isFree: false, price: 200, myRsvp: null, category: "Networking" },
  { id: "5", slug: "cricket-tournament-may-2026", title: "Alumni Cricket Tournament 2026", description: "Annual inter-batch cricket tournament. Dust off those cricket whites!", date: "May 18, 2026", time: "9:00 AM", location: "JNV Nagpur Ground", mode: "in-person", organizer: "Sports Committee", organizerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", cover: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800&h=400&fit=crop", attending: 72, interested: 145, isFree: true, myRsvp: "attending", isPast: true, category: "Sports" },
  { id: "6", slug: "mentorship-program-launch", title: "Mentorship Program Launch", description: "Official launch of NNAWCA's mentorship program connecting alumni professionals with current students.", date: "Jun 1, 2026", time: "6:00 PM IST", location: "Zoom Webinar", mode: "virtual", organizer: "NNAWCA", organizerAvatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face", cover: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop", attending: 112, interested: 289, isFree: true, myRsvp: "attending", isPast: true, category: "Webinar" },
]

const MODE_ICONS = { virtual: Video, "in-person": Building2, hybrid: Globe }
const MODE_COLORS = { virtual: "text-blue-500 bg-blue-50", "in-person": "text-green-600 bg-green-50", hybrid: "text-purple-500 bg-purple-50" }
const CATEGORIES = ["All", "Reunion", "Webinar", "Meetup", "Sports", "Networking", "Workshop"]

export default function EventsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tab, setTab] = useState<EventType>("upcoming")
  const [mode, setMode] = useState<EventMode>("all")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [rsvpStates, setRsvpStates] = useState<Record<string, string | null>>({
    "1": "interested", "2": "attending", "5": "attending", "6": "attending"
  })

  const filtered = events.filter(e => {
    if (tab === "upcoming" && e.isPast) return false
    if (tab === "past" && !e.isPast) return false
    if (tab === "mine" && !rsvpStates[e.id]) return false
    if (mode !== "all" && e.mode !== mode) return false
    if (category !== "All" && e.category !== category) return false
    return e.title.toLowerCase().includes(search.toLowerCase())
  })

  const featured = events.find(e => e.isFeatured && !e.isPast)

  function EventCard({ event }: { event: Event }) {
    const ModeIcon = MODE_ICONS[event.mode]
    const rsvp = rsvpStates[event.id]
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
        <a href={`/events/${event.slug}`} className="block relative overflow-hidden">
          <img src={event.cover} alt={event.title}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {event.isFeatured && (
            <span className="absolute top-3 left-3 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
              <Star className="h-2.5 w-2.5" /> Featured
            </span>
          )}
          <span className={`absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${MODE_COLORS[event.mode]}`}>
            <ModeIcon className="h-3 w-3" /> {event.mode}
          </span>
          <div className="absolute bottom-3 left-3">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${event.isFree ? "bg-green-500 text-white" : "bg-white text-gray-800"}`}>
              {event.isFree ? "FREE" : `₹${event.price}`}
            </span>
          </div>
        </a>

        <div className="p-4">
          <a href={`/events/${event.slug}`}>
            <h3 className="text-sm font-bold text-gray-900 hover:text-brand transition-colors line-clamp-2 leading-snug">{event.title}</h3>
          </a>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{event.description}</p>

          <div className="space-y-1.5 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5 text-brand flex-shrink-0" /> {event.date} · {event.time}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 text-red-400 flex-shrink-0" /> <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{event.attending} attending</span>
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{event.interested} interested</span>
            </div>
          </div>

          {!event.isPast && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setRsvpStates(s => ({ ...s, [event.id]: s[event.id] === "attending" ? null : "attending" }))}
                className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${rsvp === "attending" ? "bg-brand text-white" : "border border-brand text-brand hover:bg-brand-50"}`}>
                {rsvp === "attending" ? "✓ Attending" : "Attend"}
              </button>
              <button
                onClick={() => setRsvpStates(s => ({ ...s, [event.id]: s[event.id] === "interested" ? null : "interested" }))}
                className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${rsvp === "interested" ? "bg-gray-200 text-gray-700" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {rsvp === "interested" ? "★ Interested" : "Interested"}
              </button>
            </div>
          )}
          {event.isPast && (
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-center">
              <p className="text-xs text-gray-500">This event has ended</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1000px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
            <span className="text-base font-bold text-gray-900">Events</span>
          </div>
          <a href="/events/create" className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Create Event
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 py-5 space-y-4">
        {/* Featured Banner */}
        {tab === "upcoming" && featured && (
          <a href={`/events/${featured.slug}`} className="block relative overflow-hidden rounded-xl group">
            <img src={featured.cover} alt="" className="w-full h-44 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1"><Star className="h-2.5 w-2.5" /> Featured</span>
                <span className="rounded-full bg-green-500/80 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-white">{featured.category}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">{featured.title}</h2>
              <p className="text-sm text-white/70 mt-1">{featured.date} · {featured.location}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                <span>{featured.attending} attending</span>
                <span>{featured.interested} interested</span>
              </div>
            </div>
          </a>
        )}

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" />
          </div>

          {/* Mode filter */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {(["all", "virtual", "in-person", "hybrid"] as EventMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors capitalize ${mode === m ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {m === "all" ? "All Modes" : m}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-none border-b border-gray-100">
            {[
              { key: "upcoming", label: "Upcoming" },
              { key: "mine", label: "My Events", count: Object.values(rsvpStates).filter(Boolean).length },
              { key: "past", label: "Past" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as EventType)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === t.key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label}
                {(t as any).count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t.key ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>{(t as any).count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Category chips */}
          <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Event Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {tab === "mine" ? "You haven't RSVP'd to any events" : "No events found"}
            </p>
            {tab === "mine" && (
              <button onClick={() => setTab("upcoming")} className="mt-4 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
                Browse Events
              </button>
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <span className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </span>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
