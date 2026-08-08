"use client"

import { useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { VerifiedTick } from "@/components/shared/VerifiedTick"
import { Search, PenSquare } from "lucide-react"
import { colorAvatar } from "@/lib/avatar"
import type { ConversationSummary } from "@/modules/messaging/types"

export function ChatSidebar({ conversations }: { conversations: ConversationSummary[] }) {
  const pathname = usePathname()
  const [search, setSearch] = useState("")

  const activeId = pathname.startsWith("/messages/") ? pathname.split("/")[2] : null
  const totalChats = conversations.length

  const filtered = conversations.filter(
    (c) =>
      c.otherUser.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessagePreview.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
        <h1 className="flex items-center gap-2 text-base font-bold text-gray-900">
          All Chats
          <span className="rounded-[3px] bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand">{totalChats}</span>
        </h1>
        <button
          title="New message"
          className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-brand/10 text-brand hover:bg-brand hover:text-white transition-colors"
        >
          <PenSquare className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            placeholder="Search for chats"
            className="w-full rounded-[4px] border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 transition-colors"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Chat list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <ul className="space-y-0.5">
          {filtered.map((c) => {
            const active = c.id === activeId
            return (
              <li key={c.id}>
                <a
                  href={`/messages/${c.id}`}
                  className={`flex items-center gap-3 rounded-[5px] px-2.5 py-2.5 transition-colors ${
                    active ? "bg-brand/10" : "hover:bg-gray-50"
                  }`}
                >
                  {/* Square avatar */}
                  <div className="relative flex-shrink-0">
                    <Image
                      src={c.otherUser.avatar ?? colorAvatar(c.otherUser.id)}
                      alt={c.otherUser.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-[4px] object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h6 className={`flex items-center gap-1 truncate text-sm ${active ? "font-bold text-brand" : "font-semibold text-gray-900"}`}>
                        <span className="truncate">{c.otherUser.name}</span>
                        {c.otherUser.isVerified && <VerifiedTick size={14} />}
                      </h6>
                      {c.unreadCount > 0 ? (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-[3px] bg-brand px-1 text-[10px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className={`truncate text-xs ${c.unreadCount > 0 ? "font-medium text-gray-700" : "text-gray-500"}`}>
                      {c.lastMessagePreview}
                    </p>
                  </div>
                </a>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className="px-3 py-10 text-center">
              <p className="text-sm font-medium text-gray-500">
                {totalChats === 0 ? "No conversations yet" : "No chats found"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {totalChats === 0 ? "Start a chat from someone's profile" : "Try a different search"}
              </p>
            </li>
          )}
        </ul>
      </nav>
    </div>
  )
}

