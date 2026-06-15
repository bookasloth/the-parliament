"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import {
  Plus, Calendar, Clock, ThumbsUp, Share2, Link2, MessageCircle,
  X, Search, Home, Users, Menu, Video, MapPin, Globe,
} from "lucide-react"
import type { EventItem } from "@/modules/events/service"
import { rsvpAction } from "./actions"

export const MOCK_EVENTS: EventItem[] = [
  { id: "1", slug: "alumni-reunion-2026", title: "JNV Nagpur Alumni Reunion 2026", date: "Mon, Oct 15, 2026", time: "10:00 AM", mode: "in-person", cover: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop", isFree: false, price: 500, interested: true, category: "Reunion" },
  { id: "2", slug: "tech-talk-ai-careers", title: "Tech Talk: AI & Careers in 2026", date: "Sat, Jul 5, 2026", time: "7:00 PM", mode: "virtual", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop", isFree: true, interested: false, category: "Webinar" },
  { id: "3", slug: "nagpur-chapter-meetup-july", title: "Nagpur Chapter Meetup – July", date: "Sun, Jul 20, 2026", time: "7:30 PM", mode: "in-person", cover: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop", isFree: true, interested: false, category: "Meetup" },
  { id: "4", slug: "startup-showcase-2026", title: "Navodayan Startup Showcase", date: "Mon, Aug 3, 2026", time: "2:00 PM", mode: "hybrid", cover: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop", isFree: false, price: 200, interested: false, category: "Networking" },
  { id: "5", slug: "womens-leadership-summit", title: "Women Alumni Leadership Summit", date: "Sun, Sep 14, 2026", time: "11:00 AM", mode: "hybrid", cover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop", isFree: false, price: 300, interested: true, category: "Conference" },
  { id: "6", slug: "blood-donation-camp", title: "Alumni Blood Donation Camp", date: "Sat, Jul 26, 2026", time: "9:00 AM", mode: "in-person", cover: "https://images.unsplash.com/photo-1615461066159-fea0960485d5?w=600&h=400&fit=crop", isFree: true, interested: false, category: "Social Service" },
  { id: "7", slug: "cricket-tournament-2026", title: "Inter-Batch Cricket Tournament", date: "Sat, May 18, 2026", time: "9:00 AM", mode: "in-person", cover: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=600&h=400&fit=crop", isFree: true, interested: true, category: "Sports", isPast: true },
  { id: "8", slug: "agm-2026", title: "Annual General Meeting 2026", date: "Sat, Mar 22, 2026", time: "5:00 PM", mode: "in-person", cover: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop", isFree: true, interested: false, category: "Official", isPast: true },
]

const MODE_LABEL: Record<EventItem["mode"], string> = { "in-person": "Offline", virtual: "Online", hybrid: "Hybrid" }
const MODE_ICON: Record<EventItem["mode"], typeof Video> = { "in-person": MapPin, virtual: Video, hybrid: Globe }

type Tab = "upcoming" | "mine" | "past"

function EventCard({ event, onToggle }: { event: EventItem; onToggle: (id: string) => void }) {
  const [shareOpen, setShareOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ModeIcon = MODE_ICON[event.mode]

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShareOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-card transition-shadow">
      {/* Image + badge */}
      <div className="relative">
        <a href={`/events/${event.slug}`}>
          <img src={event.cover} alt={event.title} className="w-full h-36 object-cover" />
        </a>
        <span className={`absolute top-2 right-2 rounded-md px-2 py-0.5 text-[11px] font-bold text-white ${event.isFree ? "bg-green-500" : "bg-brand"}`}>
          {event.isFree ? "Free" : `₹${event.price}`}
        </span>
      </div>

      {/* Body */}
      <div className="relative px-4 pb-4 flex flex-col flex-1">
        {/* Mode tag overlapping the image */}
        <a
          href={`/events/${event.slug}`}
          className="inline-flex items-center gap-1 self-start -mt-3 mb-2 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"
        >
          <ModeIcon className="h-3 w-3" /> {MODE_LABEL[event.mode]}
        </a>

        <h6 className="text-sm font-semibold text-gray-900 leading-snug mb-2 line-clamp-2">
          <a href={`/events/${event.slug}`} className="hover:text-brand transition-colors">{event.title}</a>
        </h6>

        <p className="flex items-center gap-1.5 text-xs text-gray-500"><Calendar className="h-3.5 w-3.5" /> {event.date}</p>
        <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5"><Clock className="h-3.5 w-3.5" /> {event.time}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onToggle(event.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
              event.interested
                ? "border-green-500 bg-green-500 text-white"
                : "border-green-500 bg-white text-green-600 hover:bg-green-50"
            }`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${event.interested ? "fill-white" : ""}`} />
            {event.interested ? "Interested" : "Interested"}
          </button>

          <div className="relative" ref={ref}>
            <button
              onClick={() => setShareOpen(!shareOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-white transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            {shareOpen && (
              <div className="absolute right-0 bottom-full mb-1 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {[
                  { icon: <Share2 className="h-3.5 w-3.5" />, label: "Share on Facebook" },
                  { icon: <MessageCircle className="h-3.5 w-3.5" />, label: "Share on WhatsApp" },
                  { divider: true, icon: null, label: "" },
                  { icon: <Link2 className="h-3.5 w-3.5" />, label: "Copy Link" },
                ].map((item, i) =>
                  item.divider ? (
                    <hr key={i} className="my-1 border-gray-100" />
                  ) : (
                    <button key={i} onClick={() => setShareOpen(false)} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                      {item.icon} {item.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EventsClient({ events: initialEvents = MOCK_EVENTS }: { events?: EventItem[] }) {
  const [events, setEvents] = useState(initialEvents)
  const [tab, setTab] = useState<Tab>("upcoming")
  const [search, setSearch] = useState("")
  const [alertOpen, setAlertOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => { setEvents(initialEvents) }, [initialEvents])

  function toggleInterested(id: string) {
    // Optimistic UI update
    setEvents(prev => prev.map(e => e.id === id ? { ...e, interested: !e.interested } : e))
    // Persist via server action (only for real DB-backed events; mock ids will no-op/fail silently)
    startTransition(async () => {
      try {
        await rsvpAction(id)
      } catch {
        // revert on failure
        setEvents(prev => prev.map(e => e.id === id ? { ...e, interested: !e.interested } : e))
      }
    })
  }

  const filtered = events.filter(e => {
    if (tab === "upcoming" && e.isPast) return false
    if (tab === "past" && !e.isPast) return false
    if (tab === "mine" && !e.interested) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: "Upcoming", count: events.filter(e => !e.isPast).length },
    { key: "mine", label: "My Events", count: events.filter(e => e.interested).length },
    { key: "past", label: "Past", count: events.filter(e => e.isPast).length },
  ]

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f2ef] pb-16 lg:pb-6">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 sm:py-6 space-y-4">

        {/* Upcoming event alert */}
        {alertOpen && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm text-green-800 flex-1">
              <strong>Upcoming event:</strong> JNV Nagpur Alumni Reunion 2026 on Oct 15, 2026
            </p>
            <a href="/events/alumni-reunion-2026" className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors text-center">
              View event
            </a>
            <button onClick={() => setAlertOpen(false)} className="text-green-600 hover:text-green-800 self-end sm:self-center">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-xl">
          {/* Card header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 pt-4">
            <h1 className="text-lg font-bold text-gray-900">Discover Events</h1>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand/10 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Create event
            </button>
          </div>

          {/* Tabs + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 sm:px-5 py-3">
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${tab === t.key ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {t.label}
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === t.key ? "bg-brand/10 text-brand" : "bg-gray-200 text-gray-500"}`}>{t.count}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 transition-colors" />
            </div>
          </div>

          {/* Grid */}
          <div className="px-4 sm:px-5 pb-5">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {filtered.map(e => <EventCard key={e.id} event={e} onToggle={toggleInterested} />)}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No events here yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  {tab === "mine" ? "Mark events as interested to see them here" : "Check back soon"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create event modal (placeholder) */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h5 className="text-base font-bold text-gray-900">Create Event</h5>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Event title</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="e.g. Batch 2015 Meetup" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                  <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Time</label>
                  <input type="time" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mode</label>
                <div className="flex gap-2">
                  {(["in-person", "virtual", "hybrid"] as const).map(m => (
                    <button key={m} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:border-brand hover:text-brand transition-colors capitalize">
                      {MODE_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
              <button onClick={() => setCreateOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setCreateOpen(false)} className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-600">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <a href="/compose" className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </a>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <a href="/messages" className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></a>
        </div>
      </nav>
    </div>
  )
}
