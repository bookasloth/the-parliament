"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft, Users, Lock, Globe, Settings, Bell, BellOff,
  ThumbsUp, MessageCircle, Pin, Plus, Calendar, Home, Menu, X,
  UserPlus, PenSquare,
} from "lucide-react"
import { FeedCard, type FeedPost } from "@/components/shared/FeedCard"
import { ComposeTrigger } from "@/components/shared/ComposeTrigger"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import type { AlumniCard, Membership } from "@/lib/homepage-data"

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

// Group posts — same FeedPost shape and card as the main feed
const groupPosts: FeedPost[] = [
  {
    id: "p1",
    name: "Priya Sharma",
    headline: "Software Engineer at Google",
    batch: "23rd batch (2008–2015)",
    membership: "premium",
    isVerified: true,
    timestamp: "3h",
    content: "Just visited the campus after 10 years. The nostalgia hit differently. Missing all you guys! 🏫💛\n\n#CampusMemories #JNVNagpur",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop",
    upvotes: 54,
    downvotes: 2,
    comments: 22,
    shares: 6,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    borderType: "darkBlue",
  },
  {
    id: "p2",
    name: "Vikram Singh",
    headline: "Founder & CEO · EduStart",
    batch: "18th batch (2003–2010)",
    membership: "inactive",
    isVerified: true,
    timestamp: "6h",
    content: "Calling all alumni entrepreneurs! We're organising a startup showcase at the reunion. DM me if you want to present your venture.\n\n#Startup #Reunion2026",
    upvotes: 38,
    downvotes: 1,
    comments: 15,
    shares: 9,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    borderType: "grey",
  },
  {
    id: "p3",
    name: "Rahul Mehta",
    headline: "Product Designer at Figma",
    batch: "24th batch (2009–2016)",
    membership: "student",
    timestamp: "1d",
    content: "Who remembers the Annual Sports Day? Found some old photos. The cricket final of 2015 was legendary 🏏\n\n#SportsDay #Throwback",
    upvotes: 89,
    downvotes: 3,
    comments: 34,
    shares: 12,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    borderType: "green",
  },
]

// Members — same AlumniCard shape and card as the directory
interface GroupMember {
  card: AlumniCard
  role?: "Admin" | "Moderator"
  verified?: boolean
}

const groupMembers: GroupMember[] = [
  {
    role: "Admin",
    verified: true,
    card: { id: "a1", name: "Dr. Amit Verma", batch: "15th", batchLabel: "15th Batch", batchAlt: "15th", house: "Aravali", company: "", achievement: "", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop&crop=face", location: "New Delhi", membership: "committee" as Membership, bio: "Cardiologist · AIIMS Delhi" },
  },
  {
    role: "Moderator",
    verified: true,
    card: { id: "a2", name: "Neha Gupta", batch: "20th", batchLabel: "20th Batch", batchAlt: "20th", house: "Udaigiri", company: "", achievement: "", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face", location: "Lucknow", membership: "life" as Membership, bio: "IAS Officer · Government of India" },
  },
  {
    verified: true,
    card: { id: "m1", name: "Arjun Nair", batch: "19th", batchLabel: "19th Batch", batchAlt: "19th", house: "Aravali", company: "", achievement: "", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=face", location: "Chennai", membership: "associate" as Membership, bio: "CA · Deloitte India" },
  },
  {
    verified: true,
    card: { id: "m2", name: "Kavya Reddy", batch: "21st", batchLabel: "21st Batch", batchAlt: "21st", house: "Indira", company: "", achievement: "", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop&crop=face", location: "Hyderabad", membership: "premium" as Membership, bio: "Architect · Hafeez Contractor" },
  },
  {
    card: { id: "m3", name: "Deepa Krishnan", batch: "20th", batchLabel: "20th Batch", batchAlt: "20th", house: "Laxmi", company: "", achievement: "", image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&h=300&fit=crop&crop=face", location: "Mumbai", membership: "associate" as Membership, bio: "Journalist · NDTV" },
  },
  {
    card: { id: "m4", name: "Karan Joshi", batch: "22nd", batchLabel: "22nd Batch", batchAlt: "22nd", house: "Udaigiri", company: "", achievement: "", image: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=300&h=300&fit=crop&crop=face", location: "Bangalore", membership: "premium" as Membership, bio: "Data Scientist · Amazon" },
  },
  {
    card: { id: "m5", name: "Ananya Singh", batch: "22nd", batchLabel: "22nd Batch", batchAlt: "22nd", house: "Nilgiri", company: "", achievement: "", image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=300&fit=crop&crop=face", location: "Delhi", membership: "student" as Membership, bio: "Marketing Manager · FMCG" },
  },
]

const recentMemberAvatars = groupMembers.slice(2).map(m => ({ id: m.card.id, name: m.card.name, avatar: m.card.image }))

export default function GroupDetailPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [joined, setJoined] = useState(group.isJoined)
  const [muted, setMuted] = useState(false)
  const [activeTab, setActiveTab] = useState<"posts" | "members" | "about">("posts")
  const [connectState, setConnectState] = useState<string[]>([])

  const composeHref = `/compose?group=${group.slug}`

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
                    <a href={composeHref}
                      className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm">
                      <PenSquare className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Post</span>
                    </a>
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
            {(["posts", "members", "about"] as const).map(t => (
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
                {/* Standard compose trigger */}
                {joined && (
                  <ComposeTrigger
                    href={composeHref}
                    placeholder={`Share something with ${group.name}…`}
                  />
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

                {/* Group posts — standard feed cards */}
                {groupPosts.map(post => (
                  <FeedCard key={post.id} post={post} />
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
                    {recentMemberAvatars.map(m => (
                      <img key={m.id} src={m.avatar} alt={m.name}
                        className="h-8 w-8 rounded-full object-cover border-2 border-white" />
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

          {/* Members — standard alumni card grid */}
          {activeTab === "members" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupMembers.map((m, i) => {
                const isConnected = connectState.includes(m.card.id)
                return (
                  <motion.div
                    key={m.card.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <AlumniProfileCard
                      alumni={m.card}
                      profileHref={`/profile/${m.card.id}`}
                      verified={m.verified}
                      footer={
                        m.role ? (
                          <span className="inline-block text-[11px] font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                            Group {m.role}
                          </span>
                        ) : undefined
                      }
                      actions={
                        <>
                          <a
                            href={`/profile/${m.card.id}`}
                            className="rounded-md border border-brand bg-white px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-all duration-300"
                          >
                            View Profile
                          </a>
                          <button
                            onClick={() => setConnectState(c => c.includes(m.card.id) ? c.filter(x => x !== m.card.id) : [...c, m.card.id])}
                            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-all duration-300 ${isConnected ? "border-gray-200 bg-gray-100 text-gray-600" : "border-brand bg-brand text-white hover:bg-white hover:text-brand"}`}
                          >
                            {isConnected ? "Sent" : "Connect"}
                          </button>
                        </>
                      }
                    />
                  </motion.div>
                )
              })}
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
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <a href={composeHref} className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </a>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
