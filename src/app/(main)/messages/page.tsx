"use client"

import { useState } from "react"
import {
  Search, Edit, Home, Users, Calendar, Menu, Plus, X,
  Check, CheckCheck, Circle, MoreHorizontal, Archive, Trash2,
  Pin, BellOff, ArrowRight, MessageSquarePlus,
} from "lucide-react"

interface Conversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  time: string
  unread: number
  isOnline: boolean
  isPinned?: boolean
  isMuted?: boolean
  isRequest?: boolean
  status: "sent" | "delivered" | "read"
}

const conversations: Conversation[] = [
  { id: "c1", name: "Neha Gupta", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face", lastMessage: "Thanks for sharing the update about the reunion!", time: "9:32 AM", unread: 2, isOnline: true, isPinned: true, status: "read" },
  { id: "c2", name: "Dr. Amit Verma", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face", lastMessage: "Are you coming to the annual meet this year?", time: "Yesterday", unread: 0, isOnline: false, isPinned: true, status: "read" },
  { id: "c3", name: "Priya Sharma", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", lastMessage: "I saw your post — loved it! 🔥", time: "Mon", unread: 0, isOnline: true, status: "delivered" },
  { id: "c4", name: "Vikram Singh", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", lastMessage: "Let's catch up on the mentorship program", time: "Sun", unread: 1, isOnline: false, isMuted: true, status: "sent" },
  { id: "c5", name: "Rahul Mehta", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", lastMessage: "You: Absolutely, let me know when you're free!", time: "Fri", unread: 0, isOnline: false, status: "read" },
  { id: "c6", name: "Sunita Patel", avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop&crop=face", lastMessage: "The research paper is almost ready", time: "Wed", unread: 0, isOnline: false, status: "delivered" },
  { id: "c7", name: "Arjun Nair", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face", lastMessage: "Hi! Saw your profile on The Parliament.", time: "3d ago", unread: 1, isOnline: false, isRequest: true, status: "read" },
  { id: "c8", name: "Kavya Reddy", avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face", lastMessage: "Would love to connect with fellow Navodayans!", time: "5d ago", unread: 1, isOnline: false, isRequest: true, status: "read" },
]

export default function InboxPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<"all" | "requests">("all")
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const mainConvs = conversations.filter(c => !c.isRequest)
  const requests = conversations.filter(c => c.isRequest)
  const displayed = (tab === "all" ? mainConvs : requests).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0 flex flex-col">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[680px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
            <span className="text-base font-bold text-gray-900">Messages</span>
            {requests.length > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{requests.reduce((a, r) => a + r.unread, 0)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <a href="/messages/new" className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm">
              <MessageSquarePlus className="h-3.5 w-3.5" /> New
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[680px] px-0 sm:px-6 py-0 sm:py-4 flex-1 flex flex-col">
        {/* Search */}
        <div className="px-4 sm:px-0 pt-3 pb-2 sm:py-0 sm:mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-y sm:border border-gray-200 sm:rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { key: "all", label: "All Messages", count: mainConvs.reduce((a, c) => a + c.unread, 0) },
              { key: "requests", label: "Requests", count: requests.length },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === t.key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label}
                {t.count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t.key ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Conversation List */}
          {displayed.length === 0 ? (
            <div className="py-20 text-center">
              <Edit className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a conversation with fellow alumni</p>
              <a href="/messages/new" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
                <MessageSquarePlus className="h-4 w-4" /> Start a conversation
              </a>
            </div>
          ) : (
            <ul>
              {displayed.map((conv, i) => (
                <li key={conv.id} className={`relative border-b border-gray-50 last:border-0 ${conv.unread > 0 ? "bg-brand-50/30" : ""}`}>
                  <a href={`/messages/${conv.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img src={conv.avatar} alt={conv.name} className="h-12 w-12 rounded-full object-cover" />
                      {conv.isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
                      )}
                      {conv.isPinned && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-100 border border-white flex items-center justify-center">
                          <Pin className="h-2.5 w-2.5 text-amber-600" />
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm truncate ${conv.unread > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                          {conv.name}
                        </span>
                        <span className={`text-[11px] flex-shrink-0 ml-2 ${conv.unread > 0 ? "text-brand font-semibold" : "text-gray-400"}`}>
                          {conv.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {conv.status === "sent" && !conv.lastMessage.startsWith("You:") && <Check className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                        {conv.status === "delivered" && <CheckCheck className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                        {conv.status === "read" && !conv.lastMessage.startsWith("You:") && <CheckCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                        <p className={`text-xs truncate ${conv.unread > 0 ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                          {conv.lastMessage}
                        </p>
                        {conv.isMuted && <BellOff className="h-3 w-3 text-gray-300 flex-shrink-0 ml-auto" />}
                        {conv.unread > 0 && (
                          <span className="ml-auto flex-shrink-0 h-5 min-w-[20px] rounded-full bg-brand flex items-center justify-center text-[10px] font-bold text-white px-1">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      {conv.isRequest && (
                        <div className="flex items-center gap-2 mt-2">
                          <button className="rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-600 transition-colors" onClick={e => e.preventDefault()}>Accept</button>
                          <button className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors" onClick={e => e.preventDefault()}>Decline</button>
                        </div>
                      )}
                    </div>
                  </a>

                  {/* Context menu button */}
                  <button
                    onClick={e => { e.preventDefault(); setActiveMenu(activeMenu === conv.id ? null : conv.id) }}
                    className="absolute right-3 top-3.5 p-1.5 rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {activeMenu === conv.id && (
                    <div className="absolute right-4 top-10 z-30 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      {[
                        { icon: <Pin className="h-4 w-4" />, label: conv.isPinned ? "Unpin" : "Pin conversation" },
                        { icon: <BellOff className="h-4 w-4" />, label: conv.isMuted ? "Unmute" : "Mute notifications" },
                        { icon: <Archive className="h-4 w-4" />, label: "Archive" },
                        { icon: <Trash2 className="h-4 w-4 text-red-400" />, label: <span className="text-red-500">Delete</span> },
                      ].map((item, j) => (
                        <button key={j} onClick={() => setActiveMenu(null)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                          <span className="w-4 flex-shrink-0">{item.icon}</span>{item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
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
