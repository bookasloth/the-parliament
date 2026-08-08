"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { ChatSidebar } from "./ChatSidebar"
import { refreshConversationsAction, realtimeTokenAction } from "./actions"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { ConversationSummary } from "@/modules/messaging/types"

// Safety net only — NOT the delivery path. Brand-new conversations have no
// channel to subscribe to yet, so a slow poll picks them up (and doubles as
// reconnect catch-up if a Realtime channel drops). Live updates come from the
// per-conversation channels below, so this is 60s, not the old 10s.
const SAFETY_POLL_MS = 60_000

function previewOf(body: string | undefined, media: unknown): string {
  if (body) return body
  return Array.isArray(media) && media.length ? "📷 Photo" : ""
}

/**
 * Master-detail messaging shell (sits under the private navbar).
 *  - Desktop: chat list (left) + conversation/empty-state (right), always both.
 *  - Mobile: list fills the screen on /messages; the conversation fills the
 *    screen on /messages/[id] and the list is hidden (back button returns).
 */
export function MessagesShell({
  conversations: initialConversations,
  children,
}: {
  conversations: ConversationSummary[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const inConversation = pathname !== "/messages"
  const activeId = pathname.startsWith("/messages/") ? pathname.slice("/messages/".length) : null
  const [conversations, setConversations] = useState(initialConversations)

  // Slow safety-net poll: catches brand-new conversations (no channel yet) and
  // reconciles any drift after a dropped channel. Live path is the subscription.
  useEffect(() => {
    const id = setInterval(() => {
      refreshConversationsAction().then(setConversations)
    }, SAFETY_POLL_MS)
    return () => clearInterval(id)
  }, [])

  // Live sidebar updates via Realtime — subscribe to each conversation's private
  // channel (same infra ConversationView uses) and bump on a new message. This
  // replaces the old 10s poll: incoming DMs now land instantly, not up to 10s
  // late. Re-subscribes only when the SET of conversation ids changes (a new
  // conversation arriving via the safety poll), never on reorder.
  const idKey = conversations.map((c) => c.id).sort().join(",")
  // Read the active conversation without re-subscribing when it changes.
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId
  useEffect(() => {
    const ids = idKey ? idKey.split(",") : []
    if (ids.length === 0) return
    const supabase = getSupabaseBrowser()
    let cancelled = false
    const channels: RealtimeChannel[] = []

    async function connect() {
      const auth = await realtimeTokenAction()
      if (!auth || cancelled) return
      await supabase.realtime.setAuth(auth.token)
      const viewerId = auth.userId
      for (const cid of ids) {
        const channel = supabase.channel(`conversation:${cid}`, { config: { private: true } })
        channel.on("broadcast", { event: "new_message" }, ({ payload }) => {
          const m = payload as { senderId: string; body?: string; media?: unknown; createdAt: string }
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === cid)
            if (idx === -1) return prev
            const c = prev[idx]
            const isMine = m.senderId === viewerId
            const isActive = activeIdRef.current === cid
            // Don't grow the badge for my own sends, the open thread, or muted
            // chats. The 60s poll reconciles against the server's authoritative
            // count either way.
            const bumpUnread = !isMine && !isActive && !c.muted
            const updated: ConversationSummary = {
              ...c,
              // A new send un-deletes a chat the viewer had cleared — a live
              // message always post-dates clearedAt, so reveal it immediately.
              hidden: false,
              lastMessagePreview: previewOf(m.body, m.media),
              lastMessageAt: m.createdAt,
              unreadCount: bumpUnread ? c.unreadCount + 1 : isActive ? 0 : c.unreadCount,
            }
            // Move the touched conversation to the top (newest-first ordering).
            return [updated, ...prev.filter((_, i) => i !== idx)]
          })
        })
        channel.subscribe()
        channels.push(channel)
      }
    }

    connect()
    return () => {
      cancelled = true
      for (const ch of channels) supabase.removeChannel(ch)
    }
  }, [idKey])

  return (
    <div className="h-[calc(100dvh-3.5rem)] bg-[#f3f2ef] overflow-hidden p-0 sm:p-4 lg:px-6 lg:py-5">
      {/* Floating chat card with gutters on all sides (full-bleed on mobile) */}
      <div className="mx-auto flex h-full max-w-[1280px] overflow-hidden rounded-none border-0 bg-white sm:rounded-[5px] sm:border sm:border-gray-200 sm:shadow-sm">
        {/* Chat list */}
        <aside
          className={`${inConversation ? "hidden lg:flex" : "flex"} w-full flex-col border-r border-gray-200 bg-white lg:w-[340px] xl:w-[380px] flex-shrink-0`}
        >
          <ChatSidebar conversations={conversations.filter((c) => !c.hidden)} />
        </aside>

        {/* Detail (conversation or empty state) */}
        <main className={`${inConversation ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col bg-white`}>
          {children}
        </main>
      </div>
    </div>
  )
}
