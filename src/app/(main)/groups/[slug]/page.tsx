"use client"

import { useState } from "react"
import {
  ArrowLeft, Users, Lock, Globe, Settings, Bell, BellOff,
  ThumbsUp, MessageCircle, Share2, Bookmark, MoreHorizontal,
  ShieldCheck, Pin, Plus, Calendar, Home, Menu, X, Flag,
  UserCheck, UserPlus, ChevronRight, PenSquare, Edit3,
} from "lucide-react"

const group = {
  id: "1",
  slug: "jnv-nagpur-alumni",
  name: "JNV Nagpur Alumni – Official",
  description: "The official alumni group of JNV Nagpur (Navegaon Khairi). This is a space for all Navodayans to reconnect, share memories, celebrate achievements, and build a stronger community together. All JNV Nagpur alumni are welcome.",
  members: 2847,
  privacy: "public" as "public" | "private",
  category: "Alumni",
  cover: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=400&fit=crop",
  icon: "🏫",
  admins: [
    { id: "a1", name: "Dr. Amit Verma", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face", role: "Admin" },
    { id: "a2", name: "Neha Gupta", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face", role: "Moderator" },
  ],
  rules: [
    "Be respectful and kind to all members",
    "Only JNV Nagpur alumni may join",
    "No spam, advertisements, or off-topic posts",
    "Verify your batch before joining",
  ],
  postsThisWeek: 28,
  isJoined: true,
}

const pinnedPost = {
  id: "pin1",
  author: "Dr. Amit Verma",
  role: "Admin",
  avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face",
  text: "📢 ANNOUNCEMENT: Alumni Reunion 2026 is officially confirmed for October 15th–16th at JNV Nagpur campus. Register early for discounted tickets. Limited spots available!",
  time: "2 days ago",
  upvotes: 145,
  comments: 67,
}

const posts = [
  { id: "p1", author: "Priya Sharma", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", batch: "23rd Batch", text: "Just visited the campus after 10 years. The nostalgia hit differently. Missing all you guys! 🏫💛", time: "3h ago", upvotes: 54, comments: 22, image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop", houseColor: "#70ad47" },
  { id: "p2", author: "Vikram Singh", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", batch: "18th Batch", text: "Calling all alumni entrepreneurs! We're organising a startup showcase at the reunion. DM me if you want to present your venture.", time: "6h ago", upvotes: 38, comments: 15, houseColor: "#e8503a" },
  { id: "p3", author: "Rahul Mehta", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", batch: "24th Batch", text: "Who remembers the Annual Sports Day? Found some old photos. The cricket final of 2015 was legendary 🏏", time: "1d ago", upvotes: 89, comments: 34, houseColor: "#ffe135" },
]

const recentMembers = [
  { id: "m1", name: "Arjun Nair", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face", batch: "19th", houseColor: "#5a9bd5" },
  { id: "m2", name: "Kavya Reddy", avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face", batch: "21st", houseColor: "#ff9933" },
  { id: "m3", name: "Deepa K", avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop&crop=face", batch: "20th", houseColor: "#e75480" },
  { id: "m4", name: "Karan Joshi", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face", batch: "22nd", houseColor: "#ff9933" },
  { id: "m5", name: "Ananya S", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face", batch: "22nd", houseColor: "#70ad47" },
]

export default function GroupDetailPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [joined, setJoined] = useState(group.isJoined)
  const [muted, setMuted] = useState(false)
  const [composing, setComposing] = useState(false)
  const [postText, setPostText] = useState("")
  const [activeTab, setActiveTab] = useState<"posts" | "members" | "about" | "events">("posts")
  const [votedPosts, setVotedPosts] = useState<Record<string, number>>({})

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1000px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
          <a href="/groups" className="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Groups</span>
          </a>
          <span className="text-sm font-semibold text-gray-900 truncate flex-1">{group.name}</span>
          {joined && (
            <button onClick={() => setMuted(!muted)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 flex-shrink-0">
              {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-0 sm:px-6 py-0 sm:py-4 space-y-0 sm:space-y-4">
        {/* Hero */}
        <div className="bg-white border-0 sm:border border-gray-200 rounded-none sm:rounded-xl overflow-hidden">
          <div className="relative h-36 sm:h-48">
            <img src={group.cover} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4 flex items-center gap-2">
              <span className="text-3xl">{group.icon}</span>
              <div className="flex items-center gap-1.5">
                {group.privacy === "private" ? <Lock className="h-3.5 w-3.5 text-white/80" /> : <Globe className="h-3.5 w-3.5 text-white/80" />}
                <span className="text-xs text-white/80 capitalize">{group.privacy}</span>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">{group.name}</h1>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{group.members.toLocaleString()} members</span>
                  <span>{group.postsThisWeek} posts this week</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {joined ? (
                  <>
                    <button
                      onClick={() => setComposing(true)}
                      className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm">
                      <PenSquare className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Post</span>
                    </button>
                    <button className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-brand hover:border-brand transition-colors">
                      <Settings className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setJoined(true)}
                    className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm">
                    <UserPlus className="h-4 w-4" /> Join Group
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto scrollbar-none border-t border-gray-100">
            {(["posts", "members", "events", "about"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-shrink-0 px-5 py-3 text-xs font-semibold border-b-2 transition-colors capitalize ${activeTab === t ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-0">
          {activeTab === "posts" && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                {/* Compose */}
                {joined && (
                  composing ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" alt="" className="h-9 w-9 rounded-full object-cover" />
                        <span className="text-sm font-medium text-gray-700">Posting in {group.name}</span>
                      </div>
                      <textarea value={postText} onChange={e => setPostText(e.target.value)}
                        placeholder="Share something with the group…" rows={4}
                        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setComposing(false)} className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">Post</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setComposing(true)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-brand hover:bg-brand-50/20 transition-all text-left">
                      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" alt="" className="h-9 w-9 rounded-full object-cover" />
                      <span className="text-sm text-gray-400">Share something with the group…</span>
                      <PenSquare className="ml-auto h-4 w-4 text-gray-300" />
                    </button>
                  )
                )}

                {/* Pinned */}
                <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border-b border-amber-100">
                    <Pin className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pinned Announcement</span>
                  </div>
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={pinnedPost.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-gray-900">{pinnedPost.author}</span>
                          <span className="text-[10px] font-medium text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded-full">{pinnedPost.role}</span>
                        </div>
                        <p className="text-xs text-gray-400">{pinnedPost.time}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{pinnedPost.text}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 border-t border-gray-100 pt-3">
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{pinnedPost.upvotes}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{pinnedPost.comments}</span>
                    </div>
                  </div>
                </div>

                {/* Regular Posts */}
                {posts.map(p => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="px-4 pt-4 pb-2">
                      <div className="flex items-center gap-3">
                        <img src={p.avatar} alt="" className="h-10 w-10 rounded-full object-cover" style={{ border: `2px solid ${p.houseColor}` }} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-900">{p.author}</span>
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-100" />
                          </div>
                          <p className="text-xs text-gray-400">{p.batch} · {p.time}</p>
                        </div>
                        <button className="ml-auto p-1.5 rounded-full text-gray-300 hover:bg-gray-100"><MoreHorizontal className="h-4 w-4" /></button>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed mt-3">{p.text}</p>
                    </div>
                    {p.image && (
                      <img src={p.image} alt="" className="w-full h-48 sm:h-64 object-cover" />
                    )}
                    <div className="px-4 py-2 border-t border-gray-100">
                      <div className="flex items-center justify-around py-0.5">
                        <button
                          onClick={() => setVotedPosts(prev => ({ ...prev, [p.id]: (prev[p.id] ?? 0) === 1 ? 0 : 1 }))}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all ${(votedPosts[p.id] ?? 0) === 1 ? "text-brand bg-brand-50/50" : "text-gray-400 hover:text-brand hover:bg-brand-50/30"}`}>
                          <ThumbsUp className={`h-4 w-4 ${(votedPosts[p.id] ?? 0) === 1 ? "fill-brand" : ""}`} />
                          {p.upvotes + ((votedPosts[p.id] ?? 0) === 1 ? 1 : 0)}
                        </button>
                        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all">
                          <MessageCircle className="h-4 w-4" />{p.comments}
                        </button>
                        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-green-600 hover:bg-green-50/30 transition-all">
                          <Share2 className="h-4 w-4" />Share
                        </button>
                        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-amber-600 hover:bg-amber-50/30 transition-all">
                          <Bookmark className="h-4 w-4" />Save
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Sidebar */}
              <div className="w-full lg:w-[280px] flex-shrink-0 space-y-4">
                {/* Members preview */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">Members</h4>
                    <button onClick={() => setActiveTab("members")} className="text-xs font-medium text-brand hover:text-brand-600 transition-colors">See all</button>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">{group.members.toLocaleString()}</p>
                  <div className="flex -space-x-1.5 mb-3">
                    {recentMembers.map(m => (
                      <img key={m.id} src={m.avatar} alt={m.name}
                        className="h-8 w-8 rounded-full object-cover border-2 border-white"
                        style={{ outline: `1.5px solid ${m.houseColor}` }} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {group.admins.map(a => (
                      <div key={a.id} className="flex items-center gap-2">
                        <img src={a.avatar} alt={a.name} className="h-7 w-7 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-gray-800 truncate block">{a.name}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">{a.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group Rules */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Group Rules</h4>
                  <ol className="space-y-2">
                    {group.rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="flex-shrink-0 h-4 w-4 rounded-full bg-brand-50 text-brand text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                        {rule}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-2">
              {[...group.admins.map(a => ({ ...a, batch: "Admin", houseColor: "#009ae4" })), ...recentMembers.map(m => ({ id: m.id, name: m.name, avatar: m.avatar, role: "Member", batch: m.batch, houseColor: m.houseColor }))].map((m, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <img src={m.avatar} alt={m.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${m.houseColor}` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.batch} Batch</p>
                  </div>
                  {"role" in m && <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{m.role}</span>}
                </div>
              ))}
            </div>
          )}

          {activeTab === "about" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">About this Group</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{group.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Members", value: group.members.toLocaleString() },
                  { label: "Privacy", value: group.privacy === "public" ? "Public" : "Private" },
                  { label: "Posts/week", value: group.postsThisWeek },
                  { label: "Category", value: group.category },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No upcoming events</p>
              {joined && <button className="mt-4 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">Create Event</button>}
            </div>
          )}
        </div>
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
