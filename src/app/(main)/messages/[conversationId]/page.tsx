"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft, Phone, Video, MoreVertical, Send, UserCheck, Trash2,
  Palette, Check, Sparkles,
} from "lucide-react"
import { getConversation, type ChatMessage } from "../chat-data"
import { ChatDecorations } from "@/components/shared/ChatDecorations"
import { ALL_THEMES, DEFAULT_THEME, getActiveTheme, type ChatTheme } from "@/config/chat-themes"

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>()
  const convo = getConversation(params.conversationId)

  const [messages, setMessages] = useState<ChatMessage[]>(convo?.messages ?? [])
  const [input, setInput] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  // null = auto (date-based); otherwise an explicit preview override
  const [themeOverride, setThemeOverride] = useState<ChatTheme | null>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)

  // Active theme: explicit preview wins, else resolve from today's date
  const autoTheme = getActiveTheme(new Date())
  const theme = themeOverride ?? autoTheme

  useEffect(() => {
    setMessages(convo?.messages ?? [])
  }, [convo])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeMenuOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (!convo) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-6">
        <p className="text-sm font-medium text-gray-500">Conversation not found</p>
        <a href="/messages" className="mt-3 text-sm font-semibold text-brand hover:underline">Back to messages</a>
      </div>
    )
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function send() {
    if (!input.trim()) return
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        sender: "me",
        text: input.trim(),
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      },
    ])
    setInput("")
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    })
  }

  const isDarkTheme = theme.dark ?? false

  return (
    <div className="flex h-full flex-col">
      {/* Header: top avatar and status */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* mobile back */}
          <a href="/messages" className="lg:hidden p-1 -ml-1 text-gray-500 hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <img
            src={convo.avatar}
            alt={convo.name}
            className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
            style={convo.houseColor ? { boxShadow: `0 0 0 2px ${convo.houseColor}` } : undefined}
          />
          <div className="min-w-0">
            <h6 className="truncate text-sm font-semibold text-gray-900">{convo.name}</h6>
            <p className="truncate text-xs text-gray-500">
              {convo.online ? <span className="text-green-500">Online</span> : convo.subtitle}
            </p>
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
                <a href={`/profile/${convo.id}`} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
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
            const isMe = msg.sender === "me"
            const bubble = isMe ? theme.sent : theme.received
            return (
              <div key={msg.id}>
                {msg.dateDivider && (
                  <div className="my-3 text-center">
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: isDarkTheme ? "#cbb48a" : theme.dividerColor }}
                    >
                      {msg.dateDivider}
                    </span>
                  </div>
                )}
                <div className={`flex mb-1 ${isMe ? "justify-end" : "items-end gap-2"}`}>
                  {!isMe && (
                    <img src={convo.avatar} alt="" className="h-6 w-6 rounded-md object-cover flex-shrink-0 mb-5" />
                  )}
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[78%] sm:max-w-[65%]`}>
                    <div
                      className="rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm"
                      style={{ background: bubble.background, color: bubble.color }}
                    >
                      {msg.text}
                    </div>
                    <span className="mt-1 text-[10px]" style={{ color: isDarkTheme ? "#9c8a6b" : "#94a3b8" }}>
                      {msg.time}
                    </span>
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
