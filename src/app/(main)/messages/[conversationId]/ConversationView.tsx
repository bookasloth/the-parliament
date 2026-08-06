"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { VerifiedTick } from "@/components/shared/VerifiedTick"
import {
  ArrowLeft, Phone, Video, MoreVertical, Send, UserCheck, Trash2,
  Check, Sparkles, Smile, ImagePlus, Pencil, X, Reply, Bell, BellOff, Ban, Flag,
} from "lucide-react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { ChatDecorations } from "@/components/shared/ChatDecorations"
import { getActiveTheme } from "@/config/chat-themes"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useVideoCall, CallOverlay, type CallSignal } from "./VideoCall"
import type { MessageView } from "@/modules/messaging/types"
import { applyReaction, groupReactions } from "@/modules/messaging/reactions"
import {
  sendMessageAction, markReadAction, realtimeTokenAction,
  editMessageAction, deleteMessageAction, refreshMessagesAction,
  toggleReactionAction, setMutedAction, clearConversationAction,
  blockUserAction, reportUserAction,
} from "../actions"

const EMOJIS = [
  "😀", "😂", "🥲", "😊", "😍", "😘", "😉", "😎", "🤔", "😅",
  "😢", "😭", "😡", "😴", "🥳", "😱", "🤯", "🙄", "😇", "🤗",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👋", "✌️", "🤞", "💯",
  "❤️", "🔥", "🎉", "✨", "⭐", "☀️", "🎂", "🍕", "☕", "🙌",
]

// Quick-react bar shown on a message (Instagram-style).
const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"]

const PAGE_SIZE = 50

interface OtherUser {
  id: string
  name: string
  username: string | null
  avatar: string | null
  isVerified: boolean
}

interface Props {
  conversationId: string
  viewerId: string
  otherUser: OtherUser
  initialMessages: MessageView[]
  initialOtherLastReadAt: string | null
  initialMuted: boolean
  initialBlocked: boolean
  birthday: boolean
  suppressValentine: boolean
}

/** Client mirror of the server's nextReaction: same emoji = remove, else replace. */
function myReaction(msg: MessageView, viewerId: string): string | null {
  return msg.reactions.find((r) => r.userId === viewerId)?.emoji ?? null
}

export default function ConversationView({
  conversationId, viewerId, otherUser, initialMessages, initialOtherLastReadAt,
  initialMuted, initialBlocked, birthday, suppressValentine,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<MessageView[]>(initialMessages)
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(initialOtherLastReadAt)
  const [input, setInput] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [msgMenuId, setMsgMenuId] = useState<string | null>(null)
  const [otherOnline, setOtherOnline] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [replyTarget, setReplyTarget] = useState<MessageView | null>(null)
  const [muted, setMuted] = useState(initialMuted)
  const [blocked, setBlocked] = useState(initialBlocked)
  const [hasMore, setHasMore] = useState(initialMessages.length >= PAGE_SIZE)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const call = useVideoCall({ channelRef, viewerId })
  // The channel effect (below) subscribes once and captures handlers; route call
  // signals through a ref so they always hit the current handler, never a stale one.
  const onCallSignalRef = useRef(call.onSignal)
  onCallSignalRef.current = call.onSignal
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastTypingSentRef = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const msgMenuRef = useRef<HTMLDivElement>(null)
  // Suppress the auto scroll-to-bottom when we're prepending older history.
  const prependingRef = useRef(false)

  const theme = getActiveTheme(new Date(), { birthday, suppressValentine })

  useEffect(() => {
    if (prependingRef.current) {
      prependingRef.current = false
      return
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, otherTyping])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false)
      if (msgMenuRef.current && !msgMenuRef.current.contains(e.target as Node)) setMsgMenuId(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const lastIncomingId = [...messages].reverse().find((m) => m.senderId !== viewerId)?.id
  useEffect(() => {
    markReadAction(conversationId)
  }, [conversationId, lastIncomingId])

  useEffect(() => {
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout>
    const supabase = getSupabaseBrowser()

    async function connect() {
      const auth = await realtimeTokenAction()
      if (!auth || cancelled) return
      await supabase.realtime.setAuth(auth.token)
      refreshTimer = setTimeout(connect, 55 * 60 * 1000)
      if (channelRef.current) return

      const channel = supabase.channel(`conversation:${conversationId}`, {
        config: { private: true, presence: { key: viewerId }, broadcast: { self: false } },
      })
      channelRef.current = channel

      channel
        .on("broadcast", { event: "new_message" }, ({ payload }) => {
          const m = payload as MessageView
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
          )
        })
        .on("broadcast", { event: "edit" }, ({ payload }) => {
          const p = payload as { id: string; body: string; editedAt: string }
          setMessages((prev) => prev.map((m) => (m.id === p.id ? { ...m, body: p.body, editedAt: p.editedAt } : m)))
        })
        .on("broadcast", { event: "delete" }, ({ payload }) => {
          const p = payload as { id: string }
          setMessages((prev) => prev.map((m) => (m.id === p.id ? { ...m, deleted: true, body: "", media: [], reactions: [] } : m)))
        })
        .on("broadcast", { event: "read" }, ({ payload }) => {
          const p = payload as { userId: string; lastReadAt: string }
          if (p.userId !== viewerId) setOtherLastReadAt(p.lastReadAt)
        })
        .on("broadcast", { event: "reaction" }, ({ payload }) => {
          const p = payload as { messageId: string; userId: string; emoji: string; removed: boolean }
          setMessages((prev) => applyReaction(prev, p.messageId, p.userId, p.emoji, p.removed))
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const p = payload as { userId: string }
          if (p.userId === viewerId) return
          setOtherTyping(true)
          clearTimeout(typingClearRef.current)
          typingClearRef.current = setTimeout(() => setOtherTyping(false), 3000)
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState()
          setOtherOnline(Object.keys(state).some((k) => k !== viewerId))
        })
        .on("broadcast", { event: "call_offer" }, ({ payload }) => onCallSignalRef.current("call_offer" as CallSignal, payload))
        .on("broadcast", { event: "call_answer" }, ({ payload }) => onCallSignalRef.current("call_answer" as CallSignal, payload))
        .on("broadcast", { event: "call_ice" }, ({ payload }) => onCallSignalRef.current("call_ice" as CallSignal, payload))
        .on("broadcast", { event: "call_end" }, ({ payload }) => onCallSignalRef.current("call_end" as CallSignal, payload))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel.track({ online_at: Date.now() })
            refreshMessagesAction(conversationId).then((fresh) => {
              if (cancelled || fresh.length === 0) return
              setMessages((prev) => {
                const byId = new Map(prev.map((m) => [m.id, m]))
                for (const m of fresh) byId.set(m.id, m) // fresh wins (carries latest reactions)
                return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
              })
            })
          }
        })
    }

    connect()
    return () => {
      cancelled = true
      clearTimeout(refreshTimer)
      clearTimeout(typingClearRef.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId, viewerId])

  // Load older history when the user scrolls near the top.
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return
    setLoadingOlder(true)
    const container = scrollRef.current
    const prevHeight = container?.scrollHeight ?? 0
    const older = await refreshMessagesAction(conversationId, messages[0].createdAt)
    prependingRef.current = true
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id))
      const add = older.filter((m) => !seen.has(m.id))
      return add.length ? [...add, ...prev] : prev
    })
    setHasMore(older.length >= PAGE_SIZE)
    setLoadingOlder(false)
    // Keep the viewport anchored on the same message after prepending.
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevHeight
    })
  }, [loadingOlder, hasMore, messages, conversationId])

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 80) loadOlder()
  }

  function signalTyping() {
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: viewerId } })
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  async function send() {
    const body = input.trim()
    if (!body) return
    const reply = replyTarget
    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: MessageView = {
      id: optimisticId, senderId: viewerId, body, media: [],
      createdAt: new Date().toISOString(), editedAt: null, deleted: false,
      reactions: [],
      replyTo: reply ? { id: reply.id, senderId: reply.senderId, body: reply.body, deleted: reply.deleted } : null,
    }
    setMessages((prev) => [...prev, optimistic])
    setInput("")
    setReplyTarget(null)
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    })

    const res = await sendMessageAction(conversationId, body, [], reply?.id)
    if (res.ok) {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? res.msg : m)))
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setInput(body)
      if (reply) setReplyTarget(reply)
      alert(res.error)
    }
  }

  async function react(msg: MessageView, emoji: string) {
    if (msg.id.startsWith("optimistic-")) return
    setMsgMenuId(null)
    const current = myReaction(msg, viewerId)
    const removed = current === emoji
    const snapshot = messages
    setMessages((prev) => applyReaction(prev, msg.id, viewerId, emoji, removed))
    const res = await toggleReactionAction(msg.id, emoji)
    if (!res.ok) {
      setMessages(snapshot)
      alert(res.error)
    }
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    if (!el) {
      setInput((prev) => prev + emoji)
      return
    }
    const start = el.selectionStart ?? input.length
    const end = el.selectionEnd ?? input.length
    const next = input.slice(0, start) + emoji + input.slice(end)
    setInput(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + emoji.length
    })
    setEmojiOpen(false)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: form })
      const data = await uploadRes.json()
      if (!uploadRes.ok) {
        alert(data.error ?? "Upload failed")
        return
      }
      const res = await sendMessageAction(conversationId, "", [data.url as string], replyTarget?.id)
      if (res.ok) {
        setReplyTarget(null)
        setMessages((prev) => [...prev, res.msg])
      } else {
        alert(res.error)
      }
    } finally {
      setUploading(false)
    }
  }

  function startEdit(msg: MessageView) {
    setEditingId(msg.id)
    setEditValue(msg.body)
    setMsgMenuId(null)
  }

  async function submitEdit(messageId: string) {
    const body = editValue.trim()
    if (!body) return
    const res = await editMessageAction(messageId, body)
    if (res.ok) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body, editedAt: new Date().toISOString() } : m)))
      setEditingId(null)
    } else {
      alert(res.error)
    }
  }

  async function handleDelete(messageId: string) {
    setMsgMenuId(null)
    const res = await deleteMessageAction(messageId)
    if (res.ok) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted: true, reactions: [] } : m)))
    } else {
      alert(res.error)
    }
  }

  async function toggleMute() {
    setMenuOpen(false)
    const next = !muted
    setMuted(next)
    const res = await setMutedAction(conversationId, next)
    if (!res.ok) { setMuted(!next); alert(res.error) }
  }

  async function deleteChat() {
    setMenuOpen(false)
    if (!window.confirm("Delete this chat? It will be removed from your inbox until a new message arrives.")) return
    const res = await clearConversationAction(conversationId)
    if (res.ok) { router.push("/messages"); router.refresh() }
    else alert(res.error)
  }

  async function blockPerson() {
    setMenuOpen(false)
    if (!window.confirm(`Block ${otherUser.name}? They won't be able to message you.`)) return
    const res = await blockUserAction(otherUser.id)
    if (res.ok) { setBlocked(true); router.push("/messages"); router.refresh() }
    else alert(res.error)
  }

  async function reportPerson() {
    setMenuOpen(false)
    if (!window.confirm(`Report ${otherUser.name} to the moderators?`)) return
    const res = await reportUserAction(otherUser.id, "inappropriate")
    if (res.ok) alert("Reported. Our team will review this.")
    else alert(res.error)
  }

  const isDarkTheme = theme.dark ?? false
  const avatar = otherUser.avatar ?? "/default-avatar.png"

  const lastMineId = [...messages].reverse().find((m) => m.senderId === viewerId)?.id
  const lastMine = messages.find((m) => m.id === lastMineId)
  const seen = !!(lastMine && otherLastReadAt && otherLastReadAt >= lastMine.createdAt)

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  const stubText = (s: MessageView["replyTo"]) => (s?.deleted ? "Deleted message" : s?.body || "Attachment")

  return (
    <div className="flex h-full flex-col">
      <CallOverlay call={call} otherUser={{ name: otherUser.name, avatar: otherUser.avatar }} />
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <a href="/messages" className="lg:hidden p-1 -ml-1 text-gray-500 hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <Image src={avatar} alt={otherUser.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0">
            <h6 className="flex items-center gap-1 truncate text-sm font-semibold text-gray-900">
              <span className="truncate">{otherUser.name}</span>
              {otherUser.isVerified && <VerifiedTick size={15} />}
              {muted && <BellOff className="h-3.5 w-3.5 text-gray-400" />}
            </h6>
            <p className="truncate text-[11px] leading-tight">
              {otherTyping ? (
                <span className="text-brand font-medium">typing…</span>
              ) : otherOnline ? (
                <span className="text-green-600 font-medium">● Online</span>
              ) : (
                <span className="text-gray-400">Offline</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => call.start(false)} disabled={blocked || call.state !== "idle"} title="Audio call" className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-brand/10 disabled:hover:text-brand">
            <Phone className="h-4 w-4" />
          </button>
          <button onClick={() => call.start(true)} disabled={blocked || call.state !== "idle"} title="Video call" className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-brand/10 disabled:hover:text-brand">
            <Video className="h-4 w-4" />
          </button>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-white transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <a href={otherUser.username ? `/${otherUser.username}` : "#"} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <UserCheck className="h-4 w-4" /> View profile
                </a>
                <button onClick={toggleMute} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />} {muted ? "Unmute" : "Mute"}
                </button>
                <button onClick={reportPerson} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <Flag className="h-4 w-4" /> Report
                </button>
                <button onClick={blockPerson} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                  <Ban className="h-4 w-4" /> Block
                </button>
                <button onClick={deleteChat} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" /> Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {theme.id !== "default" && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium" style={{ background: `${theme.dividerColor}14`, color: theme.dividerColor }}>
          <Sparkles className="h-3 w-3" />
          {theme.name} theme active
        </div>
      )}

      {/* Conversation content */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative flex-1 overflow-y-auto px-3 sm:px-5 py-4"
        style={theme.conversationBackground ? { background: theme.conversationBackground } : undefined}
      >
        <ChatDecorations decoration={theme.decoration} />

        <div className="relative z-10 space-y-1">
          {loadingOlder && <p className="py-2 text-center text-[11px] text-gray-400">Loading…</p>}
          {messages.map((msg) => {
            const isMe = msg.senderId === viewerId
            const bubble = isMe ? theme.sent : theme.received
            const mine = myReaction(msg, viewerId)
            const grouped = groupReactions(msg.reactions)
            const canReact = !msg.deleted && !msg.id.startsWith("optimistic-")
            return (
              <div key={msg.id} className="group">
                <div className={`flex mb-1 ${isMe ? "justify-end" : "items-end gap-2"}`}>
                  {!isMe && (
                    <Image src={avatar} alt="" width={24} height={24} className="h-6 w-6 rounded-md object-cover flex-shrink-0 mb-5" />
                  )}

                  {/* Action trigger (left of my bubble) */}
                  {isMe && canReact && editingId !== msg.id && (
                    <MessageMenu
                      msg={msg} isMe={isMe} openId={msgMenuId} setOpenId={setMsgMenuId}
                      menuRef={msgMenuRef} onReact={react} onReply={setReplyTarget}
                      onEdit={startEdit} onDelete={handleDelete}
                    />
                  )}

                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[78%] sm:max-w-[65%]`}>
                    {/* Quoted reply stub */}
                    {msg.replyTo && !msg.deleted && (
                      <div className="mb-0.5 max-w-full truncate rounded-md border-l-2 border-brand bg-black/5 px-2 py-1 text-[11px] text-gray-500">
                        <span className="font-medium">{msg.replyTo.senderId === viewerId ? "You" : otherUser.name.split(" ")[0]}: </span>
                        {stubText(msg.replyTo)}
                      </div>
                    )}

                    {editingId === msg.id ? (
                      <div className="flex items-center gap-1.5 rounded-2xl border border-brand bg-white px-2 py-1">
                        <input
                          autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); submitEdit(msg.id) }
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          className="w-48 sm:w-64 bg-transparent px-1 py-1 text-sm text-gray-700 outline-none"
                        />
                        <button onClick={() => submitEdit(msg.id)} className="flex h-6 w-6 items-center justify-center rounded-full text-brand hover:bg-brand/10">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDoubleClick={() => canReact && react(msg, "❤️")}
                        className="relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm"
                        style={{ background: bubble.background, color: bubble.color }}
                      >
                        {msg.deleted ? (
                          <span className="italic opacity-70">This message was deleted</span>
                        ) : (
                          <>
                            {msg.body}
                            {msg.media.map((url) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={url} src={url} alt="" className="mt-1.5 max-h-64 rounded-lg object-cover" />
                            ))}
                          </>
                        )}
                        {/* Reaction pills overlapping the bubble bottom edge */}
                        {grouped.length > 0 && (
                          <div className={`absolute -bottom-2.5 ${isMe ? "right-2" : "left-2"} flex gap-0.5`}>
                            {grouped.map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => canReact && react(msg, emoji)}
                                className={`flex items-center gap-0.5 rounded-full border bg-white px-1.5 py-0.5 text-[11px] shadow-sm ${mine === emoji ? "border-brand" : "border-gray-200"}`}
                              >
                                <span>{emoji}</span>
                                {count > 1 && <span className="text-gray-500">{count}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <span className="mt-1.5 text-[10px]" style={{ color: isDarkTheme ? "#9c8a6b" : "#94a3b8" }}>
                      {formatTime(msg.createdAt)}
                      {msg.editedAt && !msg.deleted && <span className="ml-1">(edited)</span>}
                    </span>
                    {isMe && msg.id === lastMineId && seen && (
                      <span className="mt-0.5 text-[10px] text-brand">Seen</span>
                    )}
                  </div>

                  {/* Action trigger (right of their bubble) */}
                  {!isMe && canReact && (
                    <MessageMenu
                      msg={msg} isMe={isMe} openId={msgMenuId} setOpenId={setMsgMenuId}
                      menuRef={msgMenuRef} onReact={react} onReply={setReplyTarget}
                      onEdit={startEdit} onDelete={handleDelete}
                    />
                  )}
                </div>
              </div>
            )
          })}
          {otherTyping && (
            <div className="flex items-end gap-2">
              <Image src={avatar} alt="" width={24} height={24} className="h-6 w-6 rounded-md object-cover flex-shrink-0" />
              <div className="rounded-2xl px-3.5 py-2.5 shadow-sm" style={{ background: theme.received.background, color: theme.received.color }}>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-typing-dot" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-typing-dot [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-typing-dot [animation-delay:0.3s]" />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Reply preview above composer */}
      {replyTarget && (
        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2">
          <Reply className="h-4 w-4 flex-shrink-0 text-brand" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium text-gray-700">Replying to {replyTarget.senderId === viewerId ? "yourself" : otherUser.name.split(" ")[0]}</p>
            <p className="truncate text-gray-500">{replyTarget.deleted ? "Deleted message" : replyTarget.body || "Attachment"}</p>
          </div>
          <button onClick={() => setReplyTarget(null)} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Composer */}
      {blocked ? (
        <div className="border-t border-gray-200 px-4 py-4 text-center text-sm text-gray-500">
          You blocked this person. Unblock from their profile to message again.
        </div>
      ) : (
      <div className="border-t border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/10 transition-colors">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageSelect} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Attach image" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand disabled:opacity-50">
            <ImagePlus className="h-4.5 w-4.5" />
          </button>
          <div className="relative" ref={emojiRef}>
            <button onClick={() => setEmojiOpen(!emojiOpen)} title="Emoji" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand">
              <Smile className="h-4.5 w-4.5" />
            </button>
            {emojiOpen && (
              <div className="absolute bottom-full left-0 mb-1 z-30 grid w-64 grid-cols-8 gap-0.5 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => insertEmoji(e)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 text-base">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef} value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); signalTyping() }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
            rows={1} placeholder="Type a message"
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 max-h-[120px]"
          />
          <button onClick={send} disabled={!input.trim()} className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${input.trim() ? "bg-brand text-white hover:bg-brand-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
      )}
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────

function MessageMenu({
  msg, isMe, openId, setOpenId, menuRef, onReact, onReply, onEdit, onDelete,
}: {
  msg: MessageView
  isMe: boolean
  openId: string | null
  setOpenId: (id: string | null) => void
  menuRef: React.RefObject<HTMLDivElement | null>
  onReact: (msg: MessageView, emoji: string) => void
  onReply: (msg: MessageView) => void
  onEdit: (msg: MessageView) => void
  onDelete: (id: string) => void
}) {
  const open = openId === msg.id
  return (
    <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity" ref={open ? menuRef : undefined}>
      <button onClick={() => setOpenId(open ? null : msg.id)} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className={`absolute bottom-full ${isMe ? "right-0" : "left-0"} mb-1 z-30 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg`}>
          <div className="mb-1 flex justify-between px-1 pb-1">
            {QUICK_REACTIONS.map((e) => (
              <button key={e} onClick={() => onReact(msg, e)} className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-gray-100">
                {e}
              </button>
            ))}
          </div>
          <button onClick={() => { onReply(msg); setOpenId(null) }} className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded">
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
          {isMe && (
            <>
              <button onClick={() => onEdit(msg)} className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => onDelete(msg.id)} className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
