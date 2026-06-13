"use client"

import { useState } from "react"
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Share2, Bookmark,
  BookmarkCheck, Bell, BellOff, ChevronRight, Globe, Lock,
  Video, Home, Menu, Plus, X, CheckCircle, Heart, MessageCircle,
  Send, MoreHorizontal, Star, Ticket, ExternalLink, UserPlus,
  ChevronDown, ChevronUp, Play, AlertCircle, Award, Camera,
  Copy, Flag, Info,
} from "lucide-react"

const event = {
  id: "e1",
  slug: "jnv-nagpur-grand-reunion-2025",
  title: "JNV Nagpur Grand Alumni Reunion 2025",
  subtitle: "A decade of memories, a lifetime of bonds — celebrating 25 years of JNV Nagpur",
  cover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop",
  mode: "in-person" as "in-person" | "virtual" | "hybrid",
  category: "Reunion",
  date: "October 18, 2025",
  endDate: "October 19, 2025",
  time: "10:00 AM",
  endTime: "6:00 PM",
  timezone: "IST (UTC+5:30)",
  location: "JNV Nagpur Campus, Navegaon Khairi",
  address: "Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur, Maharashtra 441108",
  mapUrl: "#",
  price: "₹500",
  isFree: false,
  capacity: 500,
  registered: 287,
  interested: 143,
  isRegistered: false,
  isInterested: true,
  isSaved: false,
  isNotified: true,
  organizer: {
    name: "NNAWCA",
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=100&h=100&fit=crop",
    role: "Official Organizer",
    followers: 1247,
  },
  description: `After a long wait, the moment we've all been dreaming of is finally here! The JNV Nagpur Grand Alumni Reunion 2025 is set to be the biggest gathering of Navodayans in our school's history.

This two-day event will bring together alumni from batches spanning 1995 to 2020, faculty members, and current students for a celebration of everything that made our JNV journey unforgettable.

From the red soil of Navegaon Khairi to the heights you've all reached — this reunion is a tribute to the values, friendships, and memories that shaped us all.`,
  highlights: [
    "Meet alumni from 25+ batches",
    "Cultural performances and talent show",
    "Panel discussion: Navodayans in Public Service",
    "Alumni achievement awards",
    "School campus tour with current students",
    "Gala dinner under the stars",
  ],
  tags: ["Reunion", "Alumni", "JNV Nagpur", "2025", "Navodaya"],
  isFeatured: true,
}

const agenda = [
  {
    day: "Day 1 — October 18",
    items: [
      { time: "10:00 AM", title: "Registration & Welcome Desk", type: "logistics" },
      { time: "11:00 AM", title: "Inaugural Ceremony", desc: "Chief Guest: District Collector, Nagpur", type: "ceremony" },
      { time: "12:30 PM", title: "Batch-wise Reunion Sessions", desc: "Split into batch groups (1995–2005, 2006–2015, 2016–2020)", type: "session" },
      { time: "2:00 PM", title: "Lunch", type: "break" },
      { time: "3:30 PM", title: "Panel Discussion: Navodayans in Public Service", desc: "IAS, IPS, and IFS officers share their journey", type: "talk" },
      { time: "5:30 PM", title: "Campus Tour", type: "activity" },
      { time: "8:00 PM", title: "Gala Dinner & Cultural Night", type: "social" },
    ],
  },
  {
    day: "Day 2 — October 19",
    items: [
      { time: "9:00 AM", title: "Morning Sports & Games", type: "activity" },
      { time: "11:00 AM", title: "Alumni Achievement Awards", desc: "Honouring outstanding alumni across 10 categories", type: "ceremony" },
      { time: "1:00 PM", title: "Lunch", type: "break" },
      { time: "2:30 PM", title: "Talent Show & Cultural Performances", type: "social" },
      { time: "5:00 PM", title: "Valedictory Ceremony & Farewell", type: "ceremony" },
    ],
  },
]

const agendaColors: Record<string, string> = {
  logistics: "bg-gray-100 text-gray-600",
  ceremony: "bg-brand/10 text-brand",
  session: "bg-purple-50 text-purple-600",
  break: "bg-amber-50 text-amber-600",
  talk: "bg-green-50 text-green-700",
  activity: "bg-blue-50 text-blue-700",
  social: "bg-pink-50 text-pink-600",
}

const attendees = [
  { id: "a1", name: "Neha Gupta", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face", batch: "2008", status: "IAS Officer" },
  { id: "a2", name: "Dr. Amit Verma", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face", batch: "2005", status: "Cardiologist" },
  { id: "a3", name: "Priya Sharma", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", batch: "2010", status: "Software Engineer" },
  { id: "a4", name: "Vikram Singh", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", batch: "2007", status: "Army Officer" },
  { id: "a5", name: "Rahul Mehta", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", batch: "2012", status: "Entrepreneur" },
  { id: "a6", name: "Sunita Patel", avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop&crop=face", batch: "2009", status: "Research Scientist" },
]

const comments = [
  {
    id: "c1",
    author: { name: "Neha Gupta", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face", batch: "2008" },
    text: "So excited for this! It's been 12 years since I last walked those corridors. Can't wait to meet everyone 🥹",
    time: "2 days ago",
    likes: 24,
  },
  {
    id: "c2",
    author: { name: "Vikram Singh", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", batch: "2007" },
    text: "Already booked my tickets from Delhi! The gala dinner sounds amazing. See you all there!",
    time: "1 day ago",
    likes: 18,
  },
  {
    id: "c3",
    author: { name: "Dr. Amit Verma", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face", batch: "2005" },
    text: "Will the panel discussion be recorded? Some of us might not make Day 1 due to travel constraints.",
    time: "5 hours ago",
    likes: 7,
  },
]

const ticketTiers = [
  { id: "t1", name: "Standard Pass", price: "₹500", desc: "All sessions, lunch on both days, gala dinner", available: true },
  { id: "t2", name: "Premium Pass", price: "₹1,200", desc: "Standard + T-shirt, yearbook, VIP seating at awards", available: true },
  { id: "t3", name: "Faculty / Current Student", price: "FREE", desc: "For invited faculty and enrolled students only", available: false },
]

export default function EventDetailPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [registered, setRegistered] = useState(event.isRegistered)
  const [interested, setInterested] = useState(event.isInterested)
  const [saved, setSaved] = useState(event.isSaved)
  const [notified, setNotified] = useState(event.isNotified)
  const [commentText, setCommentText] = useState("")
  const [showShare, setShowShare] = useState(false)
  const [showAllAgenda, setShowAllAgenda] = useState(false)
  const [activeDay, setActiveDay] = useState(0)
  const [expandedDesc, setExpandedDesc] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())

  const spotsLeft = event.capacity - event.registered
  const fillPct = Math.round((event.registered / event.capacity) * 100)

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
            <a href="/events" className="p-1.5 rounded-lg text-gray-500 hover:text-brand hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px] hidden sm:block">{event.title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSaved(!saved)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              {saved ? <BookmarkCheck className="h-5 w-5 text-brand" /> : <Bookmark className="h-5 w-5 text-gray-500" />}
            </button>
            <button onClick={() => setNotified(!notified)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              {notified ? <Bell className="h-5 w-5 text-amber-500" /> : <BellOff className="h-5 w-5 text-gray-500" />}
            </button>
            <div className="relative">
              <button onClick={() => setShowShare(!showShare)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Share2 className="h-5 w-5 text-gray-500" />
              </button>
              {showShare && (
                <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {[
                    { icon: <Copy className="h-4 w-4" />, label: "Copy link" },
                    { icon: <ExternalLink className="h-4 w-4" />, label: "Share on Twitter" },
                    { icon: <ExternalLink className="h-4 w-4" />, label: "Share on LinkedIn" },
                    { icon: <ExternalLink className="h-4 w-4" />, label: "Share on WhatsApp" },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setShowShare(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                      <span className="w-4">{item.icon}</span>{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Cover */}
      <div className="relative w-full h-52 sm:h-72 lg:h-80 overflow-hidden">
        <img src={event.cover} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="flex gap-2 flex-wrap">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white border border-white/30 backdrop-blur-sm ${
              event.mode === "virtual" ? "bg-blue-500/80" : event.mode === "hybrid" ? "bg-purple-500/80" : "bg-green-600/80"
            }`}>
              {event.mode === "virtual" ? <Video className="inline h-3 w-3 mr-1" /> : event.mode === "in-person" ? <MapPin className="inline h-3 w-3 mr-1" /> : null}
              {event.mode.charAt(0).toUpperCase() + event.mode.slice(1)}
            </span>
            <span className="rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 text-xs font-semibold text-white">{event.category}</span>
            {event.isFeatured && <span className="rounded-full bg-amber-500/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white flex items-center gap-1"><Star className="h-3 w-3 fill-white" /> Featured</span>}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm border border-white/30 ${event.isFree ? "bg-green-500/80 text-white" : "bg-white/20 text-white"}`}>
            {event.isFree ? "FREE" : event.price}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 lg:py-6">
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">

          {/* Main Column */}
          <div className="space-y-4">

            {/* Title + Organizer */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-1">{event.title}</h1>
              <p className="text-sm text-gray-500 mb-4">{event.subtitle}</p>

              <div className="flex items-center gap-3">
                <img src={event.organizer.avatar} alt={event.organizer.name} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{event.organizer.name}</p>
                  <p className="text-xs text-gray-500">{event.organizer.role} · {event.organizer.followers.toLocaleString()} followers</p>
                </div>
                <button className="ml-auto text-xs font-semibold text-brand hover:underline">Follow</button>
              </div>
            </div>

            {/* Date / Time / Location */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Calendar className="h-4.5 w-4.5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{event.date} — {event.endDate}</p>
                  <p className="text-xs text-gray-500">{event.time} – {event.endTime} · {event.timezone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <MapPin className="h-4.5 w-4.5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{event.location}</p>
                  <p className="text-xs text-gray-500">{event.address}</p>
                  <a href={event.mapUrl} className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline">
                    <ExternalLink className="h-3 w-3" /> View on Google Maps
                  </a>
                </div>
              </div>
              {/* Map placeholder */}
              <div className="rounded-lg overflow-hidden border border-gray-100">
                <div className="h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  <MapPin className="h-5 w-5 mr-2" /> Map preview
                </div>
              </div>
            </div>

            {/* About */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">About This Event</h2>
              <div className={`text-sm text-gray-700 leading-relaxed whitespace-pre-line ${!expandedDesc ? "line-clamp-4" : ""}`}>
                {event.description}
              </div>
              <button onClick={() => setExpandedDesc(!expandedDesc)} className="mt-2 text-xs font-semibold text-brand hover:underline flex items-center gap-1">
                {expandedDesc ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Read more</>}
              </button>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Event Highlights</h3>
                <ul className="space-y-1.5">
                  {event.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {event.tags.map(tag => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">#{tag}</span>
                ))}
              </div>
            </div>

            {/* Agenda */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">Agenda</h2>
              <div className="flex gap-2 mb-4">
                {agenda.map((day, i) => (
                  <button key={i} onClick={() => setActiveDay(i)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${activeDay === i ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    Day {i + 1}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {agenda[activeDay].items.slice(0, showAllAgenda ? undefined : 4).map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-16 flex-shrink-0">
                      <span className="text-[11px] font-medium text-gray-500">{item.time}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${agendaColors[item.type]}`}>{item.type}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.title}</p>
                          {item.desc && <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {agenda[activeDay].items.length > 4 && (
                <button onClick={() => setShowAllAgenda(!showAllAgenda)} className="mt-3 text-xs font-semibold text-brand hover:underline flex items-center gap-1">
                  {showAllAgenda ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all {agenda[activeDay].items.length} sessions</>}
                </button>
              )}
            </div>

            {/* Attendees */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">Who's Attending</h2>
                <a href="#" className="text-xs font-semibold text-brand hover:underline">See all {event.registered}</a>
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex -space-x-2">
                  {attendees.slice(0, 5).map(a => (
                    <img key={a.id} src={a.avatar} alt={a.name} className="h-8 w-8 rounded-full border-2 border-white object-cover" />
                  ))}
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                    +{event.registered - 5}
                  </div>
                </div>
                <div className="text-xs text-gray-500 self-center">
                  <span className="font-semibold text-gray-800">{event.registered}</span> registered · <span className="font-semibold text-gray-800">{event.interested}</span> interested
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attendees.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-gray-100 p-2.5 hover:bg-gray-50 cursor-pointer">
                    <img src={a.avatar} alt={a.name} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                      <p className="text-xs text-gray-500">Batch {a.batch} · {a.status}</p>
                    </div>
                    <button className="ml-auto flex-shrink-0 text-xs text-brand hover:underline font-medium">Connect</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">{comments.length} Comments</h2>
              {/* Compose */}
              <div className="flex gap-2.5 mb-5">
                <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
                <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 focus-within:bg-white transition-all">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  />
                  {commentText.trim() && (
                    <div className="flex justify-end mt-2">
                      <button className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600">Post</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <img src={c.author.avatar} alt={c.author.name} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1">
                      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">{c.author.name}</span>
                          <span className="text-xs text-gray-400">Batch {c.author.batch}</span>
                        </div>
                        <p className="text-sm text-gray-700">{c.text}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 px-1">
                        <button
                          onClick={() => setLikedComments(s => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                          className={`flex items-center gap-1 text-xs transition-colors ${likedComments.has(c.id) ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${likedComments.has(c.id) ? "fill-red-500" : ""}`} />
                          {c.likes + (likedComments.has(c.id) ? 1 : 0)}
                        </button>
                        <button className="text-xs text-gray-400 hover:text-brand">Reply</button>
                        <button className="text-xs text-gray-400 hover:text-gray-600 ml-auto"><Flag className="h-3 w-3" /></button>
                        <span className="text-xs text-gray-400">{c.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="mt-4 lg:mt-0 space-y-4">

            {/* Registration card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 lg:sticky lg:top-[68px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-gray-900">{event.isFree ? "Free Event" : event.price}</span>
                {!event.isFree && <span className="text-xs text-gray-500">per person</span>}
              </div>

              {/* Capacity bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{event.registered} registered</span>
                  <span>{spotsLeft} spots left</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div className={`h-1.5 rounded-full transition-all ${fillPct > 80 ? "bg-red-400" : "bg-brand"}`} style={{ width: `${fillPct}%` }} />
                </div>
                {spotsLeft < 50 && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" /> Only {spotsLeft} spots remaining!
                  </p>
                )}
              </div>

              {/* Ticket tiers */}
              <div className="space-y-2 mb-4">
                {ticketTiers.map(tier => (
                  <div key={tier.id} className={`rounded-lg border p-3 ${tier.available ? "border-gray-200 cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors" : "border-dashed border-gray-200 opacity-60"}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-gray-800">{tier.name}</span>
                      <span className="text-sm font-bold text-brand">{tier.price}</span>
                    </div>
                    <p className="text-xs text-gray-500">{tier.desc}</p>
                    {!tier.available && <p className="mt-1 text-[11px] text-red-500 font-medium">Invite only</p>}
                  </div>
                ))}
              </div>

              <a href={`/events/${event.slug}/register`}>
                <button className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-600 transition-colors shadow-sm">
                  <Ticket className="inline h-4 w-4 mr-2" />
                  Register Now
                </button>
              </a>

              <button
                onClick={() => setInterested(!interested)}
                className={`mt-2 w-full rounded-xl border py-2.5 text-sm font-semibold transition-colors ${interested ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600 hover:border-brand hover:text-brand"}`}
              >
                <Star className={`inline h-4 w-4 mr-1.5 ${interested ? "fill-brand" : ""}`} />
                {interested ? "Interested" : "Mark as Interested"}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">Secure payment via Razorpay</p>
            </div>

            {/* Contact organizer */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Contact Organizer</h3>
              <div className="flex items-center gap-3 mb-3">
                <img src={event.organizer.avatar} alt={event.organizer.name} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{event.organizer.name}</p>
                  <p className="text-xs text-gray-500">{event.organizer.role}</p>
                </div>
              </div>
              <button className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-brand hover:text-brand transition-colors">
                <MessageCircle className="inline h-4 w-4 mr-1.5" />Message Organizer
              </button>
            </div>

            {/* Report */}
            <div className="px-1">
              <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                <Flag className="h-3.5 w-3.5" /> Report this event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile RSVP bar */}
      <div className="fixed bottom-[56px] left-0 right-0 z-20 lg:hidden bg-white border-t border-gray-200 px-4 py-2.5 flex gap-2">
        <a href={`/events/${event.slug}/register`} className="flex-1">
          <button className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition-colors">
            Register · {event.price}
          </button>
        </a>
        <button
          onClick={() => setInterested(!interested)}
          className={`rounded-xl border px-3 py-2.5 transition-colors ${interested ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
        >
          <Star className={`h-4.5 w-4.5 ${interested ? "fill-brand text-brand" : ""}`} />
        </button>
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
