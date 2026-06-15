"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Search, Grid, List, MapPin, GraduationCap,
  Users, UserPlus, MessageSquare, ShieldCheck, ChevronDown, X,
  Home, Calendar, Menu, Plus, SlidersHorizontal, Check,
} from "lucide-react"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import type { AlumniCard as HomeAlumniCard, Membership } from "@/lib/homepage-data"

type ViewMode = "grid" | "list"

export interface DirectoryAlumni {
  id: string
  name: string
  headline: string
  batch: string
  house: string
  houseColor: string
  location: string
  avatar: string
  isVerified: boolean
  membership: string
  membershipColor: string
  currentStatus: string
  mutualCount: number
  borderColor: string
  connections: number
}

function toCard(a: DirectoryAlumni): HomeAlumniCard {
  return {
    id: a.id,
    name: a.name,
    batch: a.batch,
    batchLabel: `${a.batch} Batch`,
    batchAlt: a.batch,
    house: a.house,
    company: "",
    achievement: "",
    image: a.avatar,
    location: a.location,
    membership: a.membership as Membership,
    bio: a.headline,
  }
}

const MEMBERSHIP_COLORS: Record<string, string> = {
  associate: "text-amber-500", student: "text-green-500",
  premium: "text-blue-700", life: "text-yellow-600",
  inactive: "text-gray-400", committee: "text-pink-500",
}
const MEMBERSHIP_BG: Record<string, string> = {
  associate: "bg-amber-50", student: "bg-green-50",
  premium: "bg-blue-50", life: "bg-yellow-50",
  inactive: "bg-gray-50", committee: "bg-pink-50",
}

export const MOCK_ALUMNI: DirectoryAlumni[] = [
  { id: "1", name: "Neha Gupta", headline: "IAS Officer · Gov. of India", batch: "20th", house: "Udaigiri", houseColor: "#ffe135", location: "Lucknow, UP", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face", isVerified: true, membership: "life", membershipColor: "text-yellow-600", currentStatus: "Working Professional", mutualCount: 14, borderColor: "#D4A017", connections: 1243 },
  { id: "2", name: "Dr. Amit Verma", headline: "Cardiologist · AIIMS Delhi", batch: "15th", house: "Aravali", houseColor: "#5a9bd5", location: "New Delhi", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face", isVerified: true, membership: "committee", membershipColor: "text-pink-500", currentStatus: "Working Professional", mutualCount: 22, borderColor: "#5a9bd5", connections: 891 },
  { id: "3", name: "Priya Sharma", headline: "Software Engineer · Google", batch: "23rd", house: "Nilgiri", houseColor: "#70ad47", location: "Bangalore, KA", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face", isVerified: true, membership: "premium", membershipColor: "text-blue-700", currentStatus: "Working Professional", mutualCount: 8, borderColor: "#70ad47", connections: 567 },
  { id: "4", name: "Vikram Singh", headline: "Founder · EduStart", batch: "18th", house: "Shiwalik", houseColor: "#e8503a", location: "Pune, MH", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face", isVerified: true, membership: "inactive", membershipColor: "text-gray-400", currentStatus: "Entrepreneur", mutualCount: 31, borderColor: "#e8503a", connections: 2100 },
  { id: "5", name: "Rahul Mehta", headline: "Product Designer · Figma", batch: "24th", house: "Udaigiri", houseColor: "#ffe135", location: "Mumbai, MH", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face", isVerified: false, membership: "student", membershipColor: "text-green-500", currentStatus: "Working Professional", mutualCount: 5, borderColor: "#D4A017", connections: 234 },
  { id: "6", name: "Sunita Patel", headline: "Research Scientist · IISc", batch: "22nd", house: "Nilgiri", houseColor: "#70ad47", location: "Bangalore, KA", avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=face", isVerified: true, membership: "associate", membershipColor: "text-amber-500", currentStatus: "Researcher", mutualCount: 11, borderColor: "#70ad47", connections: 389 },
  { id: "7", name: "Arjun Nair", headline: "CA · Deloitte India", batch: "19th", house: "Aravali", houseColor: "#5a9bd5", location: "Chennai, TN", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face", isVerified: false, membership: "associate", membershipColor: "text-amber-500", currentStatus: "Working Professional", mutualCount: 6, borderColor: "#5a9bd5", connections: 198 },
  { id: "8", name: "Kavya Reddy", headline: "Architect · Hafeez Contractor", batch: "21st", house: "Indira", houseColor: "#ff9933", location: "Hyderabad, TS", avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face", isVerified: true, membership: "premium", membershipColor: "text-blue-700", currentStatus: "Working Professional", mutualCount: 4, borderColor: "#ff9933", connections: 312 },
  { id: "9", name: "Deepa Krishnan", headline: "Journalist · NDTV", batch: "20th", house: "Laxmi", houseColor: "#e75480", location: "Mumbai, MH", avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=face", isVerified: true, membership: "associate", membershipColor: "text-amber-500", currentStatus: "Working Professional", mutualCount: 9, borderColor: "#e75480", connections: 445 },
]

const HOUSES = ["All Houses", "Aravali", "Nilgiri", "Shiwalik", "Udaigiri", "Indira", "Laxmi"]
const BATCHES = ["All Batches", "15th–17th", "18th–20th", "21st–23rd", "24th+"]
const STATUSES = ["All Statuses", "Working Professional", "Entrepreneur", "Researcher", "Student", "Retired"]
const MEMBERSHIPS = ["All Memberships", "Life", "Premium", "Associate", "Student"]
const SORT_OPTIONS = ["Most Connections", "Name (A–Z)", "Batch (Oldest)", "Batch (Newest)", "Recently Joined"]

export default function DirectoryClient({ alumni = MOCK_ALUMNI }: { alumni?: DirectoryAlumni[] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [view, setView] = useState<ViewMode>("grid")
  const [search, setSearch] = useState("")
  const [house, setHouse] = useState("All Houses")
  const [batchFilter, setBatchFilter] = useState("All Batches")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [membershipFilter, setMembershipFilter] = useState("All Memberships")
  const [sortBy, setSortBy] = useState("Most Connections")
  const [showFilters, setShowFilters] = useState(false)
  const [connected, setConnected] = useState<string[]>([])

  const filtered = alumni.filter(a =>
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.headline.toLowerCase().includes(search.toLowerCase()) || a.batch.toLowerCase().includes(search.toLowerCase())) &&
    (house === "All Houses" || a.house === house) &&
    (statusFilter === "All Statuses" || a.currentStatus === statusFilter) &&
    (membershipFilter === "All Memberships" || a.membership === membershipFilter.toLowerCase())
  )

  const activeFilters = [house, batchFilter, statusFilter, membershipFilter].filter(f => !f.startsWith("All"))

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Users className="h-5 w-5 text-brand" />
            <span className="text-sm font-semibold text-gray-900">Alumni Directory</span>
          </div>
          <div className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search alumni by name, batch, profession…"
                className="w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 focus:bg-white transition-all" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Alumni", value: "2,847", icon: <Users className="h-4 w-4 text-brand" /> },
            { label: "Verified", value: "1,203", icon: <ShieldCheck className="h-4 w-4 text-blue-500" /> },
            { label: "Batches", value: "30+", icon: <GraduationCap className="h-4 w-4 text-amber-500" /> },
            { label: "Cities", value: "120+", icon: <MapPin className="h-4 w-4 text-green-500" />, hidden: true },
          ].map((s, i) => (
            <div key={i} className={`bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2.5 ${(s as any).hidden ? "hidden sm:flex" : ""}`}>
              <div className="flex-shrink-0">{s.icon}</div>
              <div>
                <p className="text-lg font-bold text-gray-900 tabular-nums leading-none">{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors flex-shrink-0 ${showFilters || activeFilters.length ? "border-brand bg-brand-50 text-brand" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {activeFilters.length > 0 && <span className="bg-brand text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{activeFilters.length}</span>}
          </button>

          {/* Sort */}
          <div className="relative flex-shrink-0">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white pl-3 pr-7 py-2 text-sm font-medium text-gray-600 outline-none focus:border-brand appearance-none cursor-pointer">
              {SORT_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Active filter chips */}
          {activeFilters.map(f => (
            <span key={f} className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand">
              {f}
              <button onClick={() => {
                if (HOUSES.includes(f)) setHouse("All Houses")
                else if (BATCHES.includes(f)) setBatchFilter("All Batches")
                else if (STATUSES.includes(f)) setStatusFilter("All Statuses")
                else setMembershipFilter("All Memberships")
              }}><X className="h-3 w-3" /></button>
            </span>
          ))}

          <div className="flex-1" />
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button onClick={() => setView("grid")} className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}><Grid className="h-4 w-4" /></button>
            <button onClick={() => setView("list")} className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}><List className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "House", value: house, set: setHouse, options: HOUSES },
                { label: "Batch", value: batchFilter, set: setBatchFilter, options: BATCHES },
                { label: "Current Status", value: statusFilter, set: setStatusFilter, options: STATUSES },
                { label: "Membership", value: membershipFilter, set: setMembershipFilter, options: MEMBERSHIPS },
              ].map(({ label, value, set, options }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                  <div className="relative">
                    <select value={value} onChange={e => set(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-7 py-2 text-sm text-gray-700 outline-none focus:border-brand appearance-none">
                      {options.map(o => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
            {activeFilters.length > 0 && (
              <button onClick={() => { setHouse("All Houses"); setBatchFilter("All Batches"); setStatusFilter("All Statuses"); setMembershipFilter("All Memberships") }}
                className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-gray-500">{filtered.length} alumni found {search && `for "${search}"`}</p>

        {/* Grid View */}
        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map((a, i) => {
              const isConnected = connected.includes(a.id)
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <AlumniProfileCard
                    alumni={toCard(a)}
                    profileHref={`/profile/${a.id}`}
                    verified={a.isVerified}
                    footer={
                      <p className="text-xs text-gray-400">
                        {a.connections.toLocaleString()} connections
                        {a.mutualCount > 0 && <> · {a.mutualCount} mutual</>}
                      </p>
                    }
                    actions={
                      <>
                        <a
                          href={`/profile/${a.id}`}
                          className="rounded-md border border-brand bg-white px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-all duration-300"
                        >
                          View Profile
                        </a>
                        <button
                          onClick={() => setConnected(c => c.includes(a.id) ? c.filter(x => x !== a.id) : [...c, a.id])}
                          className={`flex items-center gap-1.5 rounded-md border px-4 py-1.5 text-sm font-medium transition-all duration-300 ${isConnected ? "border-gray-200 bg-gray-100 text-gray-600" : "border-brand bg-brand text-white hover:bg-white hover:text-brand"}`}
                        >
                          {isConnected ? <><Check className="h-3.5 w-3.5" /> Connected</> : <><UserPlus className="h-3.5 w-3.5" /> Connect</>}
                        </button>
                      </>
                    }
                  />
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filtered.map(a => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <a href={`/profile/${a.id}`} className="flex-shrink-0">
                  <img src={a.avatar} alt={a.name}
                    className="h-12 w-12 rounded-full object-cover"
                    style={{ border: `2.5px solid ${a.borderColor}` }} />
                </a>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <a href={`/profile/${a.id}`} className="text-sm font-semibold text-gray-900 hover:text-brand transition-colors">{a.name}</a>
                    {a.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-100 flex-shrink-0" />}
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ backgroundColor: a.houseColor, color: a.house === "Udaigiri" ? "#666" : "white" }}>
                      {a.house}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.headline}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>
                    <span className="text-[11px] text-gray-400">{a.batch} Batch</span>
                    <span className="text-[11px] text-gray-400">{a.connections} connections</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`/messages/new?to=${a.id}`} className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-brand hover:border-brand transition-colors">
                    <MessageSquare className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setConnected(c => c.includes(a.id) ? c.filter(x => x !== a.id) : [...c, a.id])}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${connected.includes(a.id) ? "bg-gray-100 text-gray-600 border border-gray-200" : "bg-brand text-white hover:bg-brand-600"}`}>
                    {connected.includes(a.id) ? "Connected" : <><UserPlus className="h-3.5 w-3.5" /> Connect</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No alumni found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different search or clear filters</p>
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
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
