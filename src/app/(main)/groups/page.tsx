"use client"

import { useState } from "react"
import {
  Search, Plus, Users, Lock, Globe, ChevronRight, Bell, BellOff,
  Home, Calendar, Menu, X, Sparkles, Star, TrendingUp, BookOpen,
  Briefcase, Dumbbell, Music, Cpu, FlaskConical,
} from "lucide-react"

interface Group {
  id: string
  slug: string
  name: string
  description: string
  members: number
  privacy: "public" | "private"
  category: string
  cover: string
  icon: string
  isJoined: boolean
  isMuted?: boolean
  lastActivity: string
  postsThisWeek: number
  isNew?: boolean
  isFeatured?: boolean
}

const CATEGORIES = ["All", "Alumni", "Professional", "Interest", "House", "Batch", "Regional"]
const CATEGORY_ICONS: Record<string, any> = {
  Alumni: Users, Professional: Briefcase, Interest: Star,
  House: Home, Batch: BookOpen, Regional: Globe,
}

const groups: Group[] = [
  { id: "1", slug: "jnv-nagpur-alumni", name: "JNV Nagpur Alumni – Official", description: "The official alumni group of JNV Nagpur (Navegaon Khairi). News, updates, and conversations for all Navodayans.", members: 2847, privacy: "public", category: "Alumni", cover: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=200&fit=crop", icon: "🏫", isJoined: true, lastActivity: "2h ago", postsThisWeek: 28, isFeatured: true },
  { id: "2", slug: "tech-navodayans", name: "Tech Navodayans", description: "A community for JNV alumni working in technology — software, AI, cloud, and more.", members: 342, privacy: "public", category: "Professional", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=200&fit=crop", icon: "💻", isJoined: true, lastActivity: "4h ago", postsThisWeek: 12 },
  { id: "3", slug: "udaigiri-house", name: "Udaigiri House — Yellow Army", description: "For all alumni who were part of the legendary Udaigiri house. Yellow forever! 💛", members: 178, privacy: "public", category: "House", cover: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=600&h=200&fit=crop", icon: "🌟", isJoined: true, lastActivity: "1d ago", postsThisWeek: 8 },
  { id: "4", slug: "batch-21-2006-2013", name: "21st Batch (2006–2013)", description: "Dedicated group for 21st batch alumni. Reconnect with your batchmates!", members: 156, privacy: "public", category: "Batch", cover: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=200&fit=crop", icon: "🎓", isJoined: false, lastActivity: "3h ago", postsThisWeek: 15, isNew: false },
  { id: "5", slug: "navodayan-entrepreneurs", name: "Navodayan Entrepreneurs", description: "Alumni who are founders, co-founders, or running their own ventures. Share, connect, and support.", members: 89, privacy: "private", category: "Professional", cover: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=200&fit=crop", icon: "🚀", isJoined: false, lastActivity: "6h ago", postsThisWeek: 6 },
  { id: "6", slug: "sports-fitness", name: "Sports & Fitness Alumni", description: "Cricket, football, athletics — celebrate the sporting spirit of JNV Nagpur!", members: 203, privacy: "public", category: "Interest", cover: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=200&fit=crop", icon: "⚽", isJoined: false, lastActivity: "2d ago", postsThisWeek: 4 },
  { id: "7", slug: "nagpur-chapter", name: "Nagpur Chapter", description: "Alumni based in Nagpur — for local meetups, events and connections.", members: 312, privacy: "public", category: "Regional", cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=200&fit=crop", icon: "🏙️", isJoined: false, lastActivity: "5h ago", postsThisWeek: 9, isNew: true },
  { id: "8", slug: "music-art-culture", name: "Music, Art & Culture", description: "For the creative souls — music lovers, artists, writers, and performers.", members: 134, privacy: "public", category: "Interest", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=200&fit=crop", icon: "🎵", isJoined: false, lastActivity: "1w ago", postsThisWeek: 2 },
]

export default function GroupsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [joinedGroups, setJoinedGroups] = useState<string[]>(["1", "2", "3"])
  const [mutedGroups, setMutedGroups] = useState<string[]>([])
  const [tab, setTab] = useState<"my" | "discover">("my")

  const toggleJoin = (id: string) =>
    setJoinedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleMute = (id: string) =>
    setMutedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const filtered = groups.filter(g =>
    (tab === "my" ? joinedGroups.includes(g.id) : !joinedGroups.includes(g.id)) &&
    (category === "All" || g.category === category) &&
    (g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()))
  )

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
            <span className="text-base font-bold text-gray-900">Groups</span>
          </div>
          <a href="/groups/create"
            className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Create Group
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 py-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" />
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { key: "my", label: "My Groups", count: joinedGroups.length },
              { key: "discover", label: "Discover", count: groups.filter(g => !joinedGroups.includes(g.id)).length },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === t.key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t.key ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none border-b border-gray-50">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Group (only in discover) */}
        {tab === "discover" && (
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-brand">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&h=200&fit=crop')] bg-cover bg-center opacity-20" />
            <div className="relative p-5 flex items-center gap-4">
              <div className="text-3xl flex-shrink-0">🏫</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Featured</span>
                  <Sparkles className="h-3 w-3 text-yellow-300" />
                </div>
                <h3 className="text-base font-bold text-white">JNV Nagpur Alumni – Official</h3>
                <p className="text-xs text-white/70 mt-0.5">2,847 members · 28 posts this week</p>
              </div>
              <button
                onClick={() => toggleJoin("1")}
                className="flex-shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-brand hover:bg-brand-50 transition-colors">
                {joinedGroups.includes("1") ? "Joined ✓" : "Join"}
              </button>
            </div>
          </div>
        )}

        {/* Groups Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(g => (
              <div key={g.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
                {/* Cover */}
                <div className="relative h-24 overflow-hidden">
                  <img src={g.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                    <span className="text-xl">{g.icon}</span>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {g.isNew && <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                    {g.privacy === "private" && <Lock className="h-3.5 w-3.5 text-white/80" />}
                    {g.isFeatured && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-0.5"><Sparkles className="h-3 w-3" />Featured</span>}
                  </div>
                </div>

                <div className="p-4">
                  <a href={`/groups/${g.slug}`}>
                    <h3 className="text-sm font-semibold text-gray-900 hover:text-brand transition-colors line-clamp-1">{g.name}</h3>
                  </a>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{g.description}</p>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{g.members.toLocaleString()} members</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{g.postsThisWeek} posts/wk</span>
                    <span className="ml-auto">{g.lastActivity}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {joinedGroups.includes(g.id) ? (
                      <>
                        <a href={`/groups/${g.slug}`}
                          className="flex-1 rounded-full border border-brand bg-brand-50 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors text-center">
                          View Group
                        </a>
                        <button onClick={() => toggleMute(g.id)}
                          className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-amber-500 hover:border-amber-200 transition-colors">
                          {mutedGroups.includes(g.id) ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => toggleJoin(g.id)}
                        className="flex-1 rounded-full bg-brand py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
                        {g.privacy === "private" ? "Request to Join" : "Join Group"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">{tab === "my" ? "You haven't joined any groups yet" : "No groups found"}</p>
            <p className="text-xs text-gray-400 mt-1">
              {tab === "my" ? "Discover and join groups to see them here" : "Try a different search or category"}
            </p>
            {tab === "my" && (
              <button onClick={() => setTab("discover")} className="mt-4 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
                Discover Groups
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
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
