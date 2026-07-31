"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {
  ArrowLeft, Phone, Video, MoreVertical, Send, UserCheck, Trash2,
  Palette, Check, Sparkles, Smile, ImagePlus, Pencil, X,
} from "lucide-react"
import { ChatDecorations } from "@/components/shared/ChatDecorations"
import { ALL_THEMES, getActiveTheme, type ChatTheme } from "@/config/chat-themes"
import type { MessageView } from "@/modules/messaging/types"
import {
  sendMessageAction, markReadAction, refreshMessagesAction, conversationMetaAction,
  editMessageAction, deleteMessageAction,
} from "../actions"

const POLL_MS = 4000

const EMOJIS = [
  "😀", "😂", "🥲", "😊", "😍", "😘", "😉", "😎", "🤔", "😅",
  "😢", "😭", "😡", "😴", "🥳", "😱", "🤯", "🙄", "😇", "🤗",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👋", "✌️", "🤞", "💯",
  "❤️", "🔥", "🎉", "✨", "⭐", "☀️", "🎂", "🍕", "☕", "🙌",
]

interface OtherUser {
  id: string
  name: string
  username: string | null
  avatar: string | null
}

interface Props {
  conversationId: string
  viewerId: string
  otherUser: OtherUser
  initialMessages: MessageView[]
  initialOtherLastReadAt: string | null
}

export default function ConversationView({ conversationId, viewerId, otherUser, initialMessages, initialOtherLastReadAt }: Props) {
  const [messages, setMessages] = useState<MessageView[]>(initialMessages)
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(initialOtherLastReadAt)
  const [input, setInput] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [msgMenuId, setMsgMenuId] = useState<string | null>(null)
  // null = auto (date-based); otherwise an explicit preview override
  const [themeOverride, setThemeOverride] = useState<ChatTheme | null>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const msgMenuRef = useRef<HTMLDivElement>(null)

  // Active theme: explicit preview wins, else resolve from today's date
  const autoTheme = getActiveTheme(new Date())
  const theme = themeOverride ?? autoTheme

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeMenuOpen(false)
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false)
      if (msgMenuRef.current && !msgMenuRef.current.contains(e.target as Node)) setMsgMenuId(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Mark read on mount and whenever a new incoming (not-mine) message shows up.
  const lastIncomingId = [...messages].reverse().find((m) => m.senderId !== viewerId)?.id
  useEffect(() => {
    markReadAction(conversationId)
  }, [conversationId, lastIncomingId])

  // Poll for new messages + the other participant's read state.
  // ponytail: re-fetches latest page (limit 50) and dedupes by id, rather than
  // threading an "after" cursor through the service — simplest correct thing
  // for a single-conversation view. Add a since-cursor if pagination depth grows.
  useEffect(() => {
    const id = setInterval(async () => {
      const [fresh, metaRes] = await Promise.all([
        refreshMessagesAction(conversationId),
        conversationMetaAction(conversationId),
      ])
      if (fresh.length) {
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id))
          const toAdd = fresh.filter((m) => !known.has(m.id))
          return toAdd.length ? [...prev, ...toAdd].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : prev
        })
      }
      if (metaRes.ok) setOtherLastReadAt(metaRes.meta.otherLastReadAt)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [conversationId])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  async function send() {
    const body = input.trim()
    if (!body) return
    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: MessageView = {
      id: optimisticId,
      senderId: viewerId,
      body,
      media: [],
      createdAt: new Date().toISOString(),
      editedAt: null,
      deleted: false,
    }
    setMessages((prev) => [...prev, optimistic])
    setInput("")
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    })

    const res = await sendMessageAction(conversationId, body)
    if (res.ok) {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? res.msg : m)))
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setInput(body)
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
      const res = await sendMessageAction(conversationId, "", [data.url as string])
      if (res.ok) {
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
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted: true } : m)))
    } else {
      alert(res.error)
    }
  }

  const isDarkTheme = theme.dark ?? false
  const avatar = otherUser.avatar ?? "/default-avatar.png"

  const lastMineId = [...messages].reverse().find((m) => m.senderId === viewerId)?.id
  const lastMine = messages.find((m) => m.id === lastMineId)
  const seen = !!(lastMine && otherLastReadAt && otherLastReadAt >= lastMine.createdAt)

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="flex h-full flex-col">
      {/* Header: top avatar and status */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* mobile back */}
          <a href="/messages" className="lg:hidden p-1 -ml-1 text-gray-500 hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <Image
            src={avatar}
            alt={otherUser.name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <h6 className="truncate text-sm font-semibold text-gray-900">{otherUser.name}</h6>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button title="Audio call" className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-white transition-colors">
            <Phone className="h-4 w-4" />
          </button>
          <button title="Video call" className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-white transition-colors">
            <Video className="h-4 w-4" />
          </button>

          {/* Theme preview (mirrors what the admin schedule controls) */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => { setThemeMenuOpen(!themeMenuOpen); setMenuOpen(false) }}
              title="Preview festive theme"
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${theme.id !== "default" ? "bg-amber-100 text-amber-600" : "bg-brand/10 text-brand hover:bg-brand hover:text-white"}`}
            >
              <Palette className="h-4 w-4" />
            </button>
            {themeMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-60 max-h-[380px] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
                <div className="px-3 py-1.5 flex items-center gap-1.5 sticky top-0 bg-white">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Chat theme</p>
                </div>
                {/* Auto option */}
                <button
                  onClick={() => { setThemeOverride(null); setThemeMenuOpen(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-700">
                    {themeOverride === null && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="flex-1 text-left text-gray-700">Auto (by date)</span>
                  <span className="text-[10px] text-gray-400">{autoTheme.name}</span>
                </button>
                {ALL_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setThemeOverride(t); setThemeMenuOpen(false) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <span className="flex gap-0.5">
                      {t.swatch.slice(0, 3).map((c, i) => (
                        <span key={i} className="h-3.5 w-3.5 rounded-full border border-gray-200" style={{ background: c }} />
                      ))}
                    </span>
                    <span className="flex-1 text-left text-gray-700">{t.name}</span>
                    {themeOverride?.id === t.id && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conversation actions */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(!menuOpen); setThemeMenuOpen(false) }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-white transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <a href={otherUser.username ? `/profile/${otherUser.username}` : "#"} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <UserCheck className="h-4 w-4" /> View profile
                </a>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" /> Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Festive theme banner */}
      {theme.id !== "default" && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium" style={{ background: `${theme.dividerColor}14`, color: theme.dividerColor }}>
          <Sparkles className="h-3 w-3" />
          {theme.name} theme active
          {themeOverride && <span className="opacity-70">(preview)</span>}
        </div>
      )}

      {/* Conversation content */}
      <div
        className="relative flex-1 overflow-y-auto px-3 sm:px-5 py-4"
        style={theme.conversationBackground ? { background: theme.conversationBackground } : undefined}
      >
        <ChatDecorations decoration={theme.decoration} />

        <div className="relative z-10 space-y-1">
          {messages.map((msg) => {
            const isMe = msg.senderId === viewerId
            const bubble = isMe ? theme.sent : theme.received
            return (
              <div key={msg.id} className="group">
                <div className={`flex mb-1 ${isMe ? "justify-end" : "items-end gap-2"}`}>
                  {!isMe && (
                    <Image src={avatar} alt="" width={24} height={24} className="h-6 w-6 rounded-md object-cover flex-shrink-0 mb-5" />
                  )}
                  {isMe && !msg.deleted && editingId !== msg.id && (
                    <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity" ref={msgMenuId === msg.id ? msgMenuRef : undefined}>
                      <button
                        onClick={() => setMsgMenuId(msgMenuId === msg.id ? null : msg.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                      {msgMenuId === msg.id && (
                        <div className="absolute right-0 bottom-full mb-1 z-30 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button onClick={() => startEdit(msg)} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => handleDelete(msg.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[78%] sm:max-w-[65%]`}>
                    {editingId === msg.id ? (
                      <div className="flex items-center gap-1.5 rounded-2xl border border-brand bg-white px-2 py-1">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
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
                        className="rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm"
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
                      </div>
                    )}
                    <span className="mt-1 text-[10px]" style={{ color: isDarkTheme ? "#9c8a6b" : "#94a3b8" }}>
                      {formatTime(msg.createdAt)}
                      {msg.editedAt && !msg.deleted && <span className="ml-1">(edited)</span>}
                    </span>
                    {isMe && msg.id === lastMineId && seen && (
                      <span className="mt-0.5 text-[10px] text-brand">Seen</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
      </div>

      {/* Footer: autoresize textarea + send */}
      <div className="border-t border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/10 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach image"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand disabled:opacity-50"
          >
            <ImagePlus className="h-4.5 w-4.5" />
          </button>
          <div className="relative" ref={emojiRef}>
            <button
              onClick={() => setEmojiOpen(!emojiOpen)}
              title="Emoji"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand"
            >
              <Smile className="h-4.5 w-4.5" />
            </button>
            {emojiOpen && (
              <div className="absolute bottom-full left-0 mb-1 z-30 grid w-64 grid-cols-8 gap-0.5 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => insertEmoji(e)}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 text-base"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize() }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
            rows={1}
            placeholder="Type a message"
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 max-h-[120px]"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${input.trim() ? "bg-brand text-white hover:bg-brand-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
