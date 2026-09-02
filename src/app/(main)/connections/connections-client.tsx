"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Search, MessageSquare, Users, Menu, X, Filter,
  Clock, ArrowLeft,
} from "lucide-react"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import { FollowButton } from "@/components/shared/FollowButton"
import { InviteFriend } from "./invite-friend"
import type { AlumniCard, Membership } from "@/lib/homepage-data"

type TabType = "following" | "followers" | "suggestions"

interface AlumniUser {
  id: string
  userId?: string
  name: string
  headline: string
  batch: string
  house: string
  houseColor: string
  location: string
  avatar: string
  mutualCount: number
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

const HOUSE_FILTER = ["All Houses", "Aravali", "Nilgiri", "Shiwalik", "Udaigiri", "Jawahar", "Tilak", "Subhash", "Rajiv", "Indira", "Laxmi"]

interface ConnectionsClientProps {
  following?: AlumniUser[]
  followers?: AlumniUser[]
  suggestions?: AlumniUser[]
}

export default function ConnectionsClient({
  following = [],
  followers = [],
  suggestions = [],
}: ConnectionsClientProps) {
  const [tab, setTab] = useState<TabType>("following")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [houseFilter, setHouseFilter] = useState("All Houses")
  const [showFilters, setShowFilters] = useState(false)

  // People I follow — used to hydrate the "Follow back" state on the Followers tab.
  const followingSet = new Set(following.map((u) => u.userId))

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "following", label: "Following", count: following.length },
    { key: "followers", label: "Followers", count: followers.length },
    { key: "suggestions", label: "People You May Know", count: suggestions.length },
  ]

  const filtered = (list: AlumniUser[]) => list.filter(u =>
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.headline.toLowerCase().includes(search.toLowerCase())) &&
    (houseFilter === "All Houses" || u.house === houseFilter)
  )

  function PersonCard({ user, mode }: { user: AlumniUser; mode: TabType }) {
    const iFollow = mode === "following" || followingSet.has(user.userId)

    const footer = (
      <div className="space-y-0.5">
        {mode === "following" && user.since && (
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> Following since {user.since}
          </p>
        )}
        {mode === "followers" && user.since && (
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> Follows you since {user.since}
          </p>
        )}
      </div>
    )

    const actions = (
      <>
        {mode === "following" ? (
          <a href={`/messages/conv-${user.id}`}
            className="flex items-center gap-1.5 rounded-[3px] border border-brand bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-white hover:text-brand transition-all duration-300">
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </a>
        ) : (
          <a href={`/${user.id}`}
            className="rounded-[3px] border border-brand bg-white px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-all duration-300">
            View Profile
          </a>
        )}
        {user.userId && <FollowButton userId={user.userId} initialFollowing={iFollow} />}
      </>
    )

    return (
      <AlumniProfileCard
        alumni={toCard(user)}
        profileHref={`/${user.id}`}
        footer={footer}
        actions={actions}
      />
    )
  }

  const currentList =
    tab === "following" ? filtered(following) :
    tab === "followers" ? filtered(followers) :
    filtered(suggestions)

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      {sidebarOpen && <div role="presentation" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-[4px] hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Users className="h-5 w-5 text-brand flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900">My Network</span>
          </div>
          <a href="/community" className="text-xs font-medium text-brand hover:text-brand-600 flex items-center gap-1 transition-colors">
            Find Alumni <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5 space-y-4">
        <div className="max-w-md">
          <InviteFriend />
        </div>
        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-none">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold border-b-2 transition-colors ${tab === t.key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label}
                {t.count > 0 && (
                  <span className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold ${tab === t.key ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
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
              placeholder={`Search ${tab === "suggestions" ? "suggestions" : tab}…`}
              className="w-full rounded-[5px] border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-[5px] border px-3 py-2.5 text-sm font-medium transition-colors ${showFilters ? "border-brand bg-brand-50 text-brand" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        {/* Filter Chips */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-[5px] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Filter by House</p>
            <div className="flex flex-wrap gap-2">
              {HOUSE_FILTER.map(h => (
                <button key={h} onClick={() => setHouseFilter(h)}
                  className={`rounded-[3px] px-3 py-1 text-xs font-medium transition-colors ${houseFilter === h ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Bar (following only) */}
        {tab === "following" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Following", value: following.length, color: "text-brand" },
              { label: "Followers", value: followers.length, color: "text-amber-500" },
              { label: "Suggestions", value: suggestions.length, color: "text-purple-500" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-[5px] p-3 text-center">
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
                <PersonCard user={u} mode={tab} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-[5px] py-16 text-center">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No results found</p>
            <p className="text-xs text-gray-400 mt-1">
              {tab === "following" ? "You're not following anyone yet." : tab === "followers" ? "No followers yet." : "Try adjusting your search or filters"}
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
