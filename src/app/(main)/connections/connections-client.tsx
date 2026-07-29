"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import {
  Search, UserPlus, UserX, MessageSquare,
  Home, Users, Calendar, Menu, Plus, X, Filter,
  Clock, Check, ArrowLeft,
} from "lucide-react"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import type { AlumniCard, Membership } from "@/lib/homepage-data"
import { connectAction, acceptAction, rejectAction } from "./actions"

type TabType = "connected" | "sent" | "received" | "suggestions"

interface AlumniUser {
  id: string
  userId?: string
  connectionId?: string
  name: string
  headline: string
  batch: string
  house: string
  houseColor: string
  location: string
  avatar: string
  mutualCount: number
  sentAt?: string
  since?: string
  borderColor: string
  membership: Membership
}

function toCard(u: AlumniUser): AlumniCard {
  return {
    id: u.id,
    name: u.name,
    batch: u.batch,
    batchLabel: u.batch,
    batchAlt: u.batch,
    house: u.house,
    company: "",
    achievement: "",
    image: u.avatar,
    location: u.location,
    membership: u.membership,
    bio: u.headline,
  }
}

export const MOCK_CONNECTED: AlumniUser[] = [
  { id: "1", name: "Neha Gupta", headline: "IAS Officer · Government of India", batch: "20th Batch", house: "Udaigiri", houseColor: "#ffe135", location: "Lucknow", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face", mutualCount: 14, since: "Jan 2025", borderColor: "#D4A017", membership: "life" },
  { id: "2", name: "Dr. Amit Verma", headline: "Cardiologist · AIIMS Delhi", batch: "15th Batch", house: "Aravali", houseColor: "#5a9bd5", location: "New Delhi", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop&crop=face", mutualCount: 22, since: "Mar 2024", borderColor: "#5a9bd5", membership: "committee" },
  { id: "3", name: "Priya Sharma", headline: "Software Engineer · Google", batch: "23rd Batch", house: "Nilgiri", houseColor: "#70ad47", location: "Bangalore", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=face", mutualCount: 8, since: "Nov 2024", borderColor: "#70ad47", membership: "premium" },
  { id: "4", name: "Vikram Singh", headline: "Founder & CEO · EduStart", batch: "18th Batch", house: "Shiwalik", houseColor: "#e8503a", location: "Pune", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face", mutualCount: 31, since: "Jun 2024", borderColor: "#e8503a", membership: "inactive" },
  { id: "5", name: "Rahul Mehta", headline: "Product Designer · Figma", batch: "24th Batch", house: "Udaigiri", houseColor: "#ffe135", location: "Mumbai", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face", mutualCount: 5, since: "Feb 2025", borderColor: "#D4A017", membership: "student" },
  { id: "6", name: "Sunita Patel", headline: "Research Scientist · IISc", batch: "22nd Batch", house: "Nilgiri", houseColor: "#70ad47", location: "Bangalore", avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=300&h=300&fit=crop&crop=face", mutualCount: 11, since: "Sep 2024", borderColor: "#70ad47", membership: "associate" },
]

export const MOCK_PENDING: AlumniUser[] = [
  { id: "7", name: "Arjun Nair", headline: "CA · Deloitte India", batch: "19th Batch", house: "Aravali", houseColor: "#5a9bd5", location: "Chennai", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=face", mutualCount: 6, sentAt: "3 days ago", borderColor: "#5a9bd5", membership: "associate" },
  { id: "8", name: "Kavya Reddy", headline: "Architect · Hafeez Contractor", batch: "21st Batch", house: "Indira", houseColor: "#ff9933", location: "Hyderabad", avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop&crop=face", mutualCount: 4, sentAt: "1 week ago", borderColor: "#ff9933", membership: "premium" },
]

export const MOCK_RECEIVED: AlumniUser[] = [
  { id: "9", name: "Mohit Gupta", headline: "Army Officer · Indian Army", batch: "17th Batch", house: "Shiwalik", houseColor: "#e8503a", location: "Pune", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face", mutualCount: 18, sentAt: "2 days ago", borderColor: "#e8503a", membership: "associate" },
  { id: "10", name: "Deepa Krishnan", headline: "Journalist · NDTV", batch: "20th Batch", house: "Laxmi", houseColor: "#e75480", location: "Mumbai", avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&h=300&fit=crop&crop=face", mutualCount: 9, sentAt: "5 days ago", borderColor: "#e75480", membership: "associate" },
]

export const MOCK_SUGGESTIONS: AlumniUser[] = [
  { id: "11", name: "Rohan Sharma", headline: "Civil Engineer · L&T", batch: "21st Batch", house: "Aravali", houseColor: "#5a9bd5", location: "Mumbai", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face", mutualCount: 12, borderColor: "#5a9bd5", membership: "associate" },
  { id: "12", name: "Ananya Singh", headline: "Marketing Manager · FMCG", batch: "22nd Batch", house: "Nilgiri", houseColor: "#70ad47", location: "Delhi", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=300&fit=crop&crop=face", mutualCount: 7, borderColor: "#70ad47", membership: "student" },
  { id: "13", name: "Karan Joshi", headline: "Data Scientist · Amazon", batch: "24th Batch", house: "Udaigiri", houseColor: "#ffe135", location: "Bangalore", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=300&h=300&fit=crop&crop=face", mutualCount: 15, borderColor: "#D4A017", membership: "premium" },
  { id: "14", name: "Pooja Desai", headline: "Lawyer · Supreme Court", batch: "19th Batch", house: "Laxmi", houseColor: "#e75480", location: "Delhi", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face", mutualCount: 3, borderColor: "#e75480", membership: "life" },
]

const HOUSE_FILTER = ["All Houses", "Aravali", "Nilgiri", "Shiwalik", "Udaigiri", "Indira", "Laxmi"]

interface ConnectionsClientProps {
  connected?: AlumniUser[]
  pending?: AlumniUser[]
  received?: AlumniUser[]
  suggestions?: AlumniUser[]
}

export default function ConnectionsClient({
  connected = MOCK_CONNECTED,
  pending = MOCK_PENDING,
  received = MOCK_RECEIVED,
  suggestions = MOCK_SUGGESTIONS,
}: ConnectionsClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tab, setTab] = useState<TabType>("connected")
  const [search, setSearch] = useState("")
  const [houseFilter, setHouseFilter] = useState("All Houses")
  const [showFilters, setShowFilters] = useState(false)
  const [connectedList] = useState(connected)
  const [removedConnections, setRemovedConnections] = useState<string[]>([])
  const [acceptedRequests, setAcceptedRequests] = useState<string[]>([])
  const [declinedRequests, setDeclinedRequests] = useState<string[]>([])
  const [sentList, setSentList] = useState<string[]>([])
  const [, startTransition] = useTransition()

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "connected", label: "Connections", count: connectedList.length },
    { key: "received", label: "Requests", count: received.filter(r => !acceptedRequests.includes(r.id) && !declinedRequests.includes(r.id)).length },
    { key: "sent", label: "Sent", count: pending.length },
    { key: "suggestions", label: "People You May Know", count: suggestions.length },
  ]

  const filtered = (list: AlumniUser[]) => list.filter(u =>
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.headline.toLowerCase().includes(search.toLowerCase())) &&
    (houseFilter === "All Houses" || u.house === houseFilter)
  )

  function ConnectionCard({ user, mode }: { user: AlumniUser; mode: TabType }) {
    const isRemoved = removedConnections.includes(user.id)
    const isAccepted = acceptedRequests.includes(user.id)
    const isDeclined = declinedRequests.includes(user.id)
    const isSent = sentList.includes(user.id)

    const footer = (
      <div className="space-y-0.5">
        {user.mutualCount > 0 && (
          <p className="text-xs text-gray-400">{user.mutualCount} mutual connections</p>
        )}
        {mode === "connected" && user.since && (
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> Connected since {user.since}
          </p>
        )}
        {(mode === "sent" || mode === "received") && user.sentAt && (
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> {mode === "sent" ? "Sent" : "Received"} {user.sentAt}
          </p>
        )}
      </div>
    )

    let actions: React.ReactNode

    if (mode === "connected") {
      actions = isRemoved ? (
        <div className="flex items-center justify-between w-full bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-500">Connection removed</span>
          <button onClick={() => setRemovedConnections(r => r.filter(x => x !== user.id))}
            className="text-xs font-medium text-brand hover:text-brand-600 transition-colors">Undo</button>
        </div>
      ) : (
        <>
          <a href={`/messages/conv-${user.id}`}
            className="flex items-center gap-1.5 rounded-md border border-brand bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-white hover:text-brand transition-all duration-300">
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </a>
          <button onClick={() => setRemovedConnections(r => [...r, user.id])} title="Remove connection"
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-500 hover:border-red-300 hover:text-red-500 transition-all duration-300">
            <UserX className="h-3.5 w-3.5" />
          </button>
        </>
      )
    } else if (mode === "sent") {
      actions = (
        <button className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all duration-300">
          Withdraw Request
        </button>
      )
    } else if (mode === "received") {
      actions = (isAccepted || isDeclined) ? (
        <span className={`text-sm font-medium px-4 py-1.5 rounded-md ${isAccepted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {isAccepted ? "Connected!" : "Declined"}
        </span>
      ) : (
        <>
          <button onClick={() => {
            setAcceptedRequests(a => [...a, user.id])
            if (user.connectionId) startTransition(() => { void acceptAction(user.connectionId!) })
          }}
            className="flex items-center gap-1.5 rounded-md border border-brand bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-white hover:text-brand transition-all duration-300">
            <Check className="h-3.5 w-3.5" /> Accept
          </button>
          <button onClick={() => {
            setDeclinedRequests(d => [...d, user.id])
            if (user.connectionId) startTransition(() => { void rejectAction(user.connectionId!) })
          }}
            className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all duration-300">
            Decline
          </button>
        </>
      )
    } else {
      actions = (
        <>
          <a href={`/profile/${user.id}`}
            className="rounded-md border border-brand bg-white px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-all duration-300">
            View Profile
          </a>
          <button onClick={() => {
            setSentList(s => s.includes(user.id) ? s.filter(x => x !== user.id) : [...s, user.id])
            if (!sentList.includes(user.id) && user.userId) {
              startTransition(() => { void connectAction(user.userId!) })
            }
          }}
            className={`flex items-center gap-1.5 rounded-md border px-4 py-1.5 text-sm font-medium transition-all duration-300 ${isSent ? "border-gray-200 bg-gray-100 text-gray-600" : "border-brand bg-brand text-white hover:bg-white hover:text-brand"}`}>
            {isSent ? <><Check className="h-3.5 w-3.5" /> Sent</> : <><UserPlus className="h-3.5 w-3.5" /> Connect</>}
          </button>
        </>
      )
    }

    return (
      <div className={`transition-opacity ${isRemoved ? "opacity-60" : ""}`}>
        <AlumniProfileCard
          alumni={toCard(user)}
          profileHref={`/profile/${user.id}`}
          footer={footer}
          actions={actions}
        />
      </div>
    )
  }

  const currentList =
    tab === "connected" ? filtered(connectedList) :
    tab === "sent" ? filtered(pending) :
    tab === "received" ? filtered(received) :
    filtered(suggestions)

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Users className="h-5 w-5 text-brand flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900">My Network</span>
          </div>
          <a href="/directory" className="text-xs font-medium text-brand hover:text-brand-600 flex items-center gap-1 transition-colors">
            Find Alumni <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5 space-y-4">
        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-none">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold border-b-2 transition-colors ${tab === t.key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label}
                {t.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t.key ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab === "suggestions" ? "suggestions" : "connections"}…`}
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${showFilters ? "border-brand bg-brand-50 text-brand" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        {/* Filter Chips */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Filter by House</p>
            <div className="flex flex-wrap gap-2">
              {HOUSE_FILTER.map(h => (
                <button key={h} onClick={() => setHouseFilter(h)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${houseFilter === h ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Bar (connected only) */}
        {tab === "connected" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Connected", value: connectedList.length, color: "text-brand" },
              { label: "Pending", value: pending.length, color: "text-amber-500" },
              { label: "Suggestions", value: suggestions.length, color: "text-purple-500" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${s.color} tabular-nums`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {currentList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {currentList.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <ConnectionCard user={u} mode={tab} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No results found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <span className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </span>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
