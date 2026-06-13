"use client"

import { useState, useRef, useEffect } from "react"
import {
  ArrowLeft, Phone, Video, MoreHorizontal, Smile, Paperclip,
  Send, Image as ImageIcon, Mic, CheckCheck, Check, Circle,
  Home, Users, Calendar, Menu, Plus, X, ChevronDown,
  ShieldCheck, Info, Archive, Trash2, BellOff, UserX,
} from "lucide-react"

type MessageStatus = "sent" | "delivered" | "read"

interface Message {
  id: string
  text?: string
  image?: string
  sender?: "me" | "them"
  time: string
  status?: MessageStatus
  reactions?: string[]
  isSystem?: boolean
}

const recipient = {
  id: "c1",
  name: "Neha Gupta",
  headline: "IAS Officer · Government of India",
  avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
  isOnline: true,
  lastSeen: "Online",
  batch: "20th Batch",
  houseColor: "#D4A017",
}

const initialMessages: Message[] = [
  { id: "1", text: "Hey! I saw your post about the cricket memories. Nostalgic!", sender: "them", time: "9:15 AM", reactions: ["❤️"] },
  { id: "2", text: "Haha yes! Those days at JNV were something else. Do you remember the inter-house tournaments?", sender: "me", time: "9:18 AM", status: "read" },
  { id: "3", text: "Oh absolutely! Udaigiri vs Aravali finals were legendary. We had so much passion back then.", sender: "them", time: "9:20 AM" },
  { id: "4", text: "True. By the way, are you attending the alumni reunion in October?", sender: "me", time: "9:22 AM", status: "read" },
  { id: "5", text: "I'm planning to! Just need to confirm the dates with my office. What about you?", sender: "them", time: "9:24 AM" },
  { id: "6", text: "Yes, definitely attending. I'm helping organise it actually.", sender: "me", time: "9:26 AM", status: "delivered" },
  { id: "7", isSystem: true, text: "Today", time: "" },
  { id: "8", text: "That's amazing Shubham! The Parliament platform looks incredible. You've built something really special for all of us.", sender: "them", time: "9:28 AM" },
  { id: "9", text: "Thanks for sharing the update about the reunion!", sender: "them", time: "9:32 AM" },
]

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"]

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputText, setInputText] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [reactionFor, setReactionFor] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (inputText.length > 0) {
      setIsTyping(true)
      const t = setTimeout(() => setIsTyping(false), 1500)
      return () => clearTimeout(t)
    }
  }, [inputText])

  function sendMessage() {
    if (!inputText.trim()) return
    const msg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "me",
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    }
    setMessages(prev => [...prev, msg])
    setInputText("")
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "delivered" } : m))
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "read" } : m))
      }, 1500)
    }, 800)
  }

  return (
    <div className="flex h-screen flex-col bg-[#f3f2ef] overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex h-[56px] items-center gap-3 px-3 sm:px-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
          <a href="/messages" className="p-1.5 rounded-lg text-gray-500 hover:text-brand hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </a>

          <button onClick={() => setShowInfo(!showInfo)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
            <div className="relative flex-shrink-0">
              <img src={recipient.avatar} alt={recipient.name} className="h-9 w-9 rounded-full object-cover" style={{ border: `2px solid ${recipient.houseColor}` }} />
              {recipient.isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-1.5 border-white" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-900 truncate">{recipient.name}</span>
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-100 flex-shrink-0" />
              </div>
              <p className={`text-xs ${recipient.isOnline ? "text-green-500" : "text-gray-400"}`}>
                {isTyping ? <span className="text-brand">typing…</span> : recipient.lastSeen}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-brand transition-colors" title="Voice call">
              <Phone className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-brand transition-colors" title="Video call">
              <Video className="h-5 w-5" />
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {[
                    { icon: <Info className="h-4 w-4" />, label: "View profile" },
                    { icon: <Archive className="h-4 w-4" />, label: "Archive chat" },
                    { icon: <BellOff className="h-4 w-4" />, label: "Mute notifications" },
                    { icon: <Trash2 className="h-4 w-4 text-red-400" />, label: <span className="text-red-500">Delete chat</span> },
                    { icon: <UserX className="h-4 w-4 text-red-400" />, label: <span className="text-red-500">Block user</span> },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setShowMenu(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                      <span className="w-4 flex-shrink-0">{item.icon}</span>{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-1"
        onScroll={e => setShowScrollBtn((e.target as HTMLDivElement).scrollTop < -200)}>

        {messages.map((msg, i) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium px-2">{msg.text}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )
          }
          const isMe = msg.sender === "me"
          const prevMsg = messages[i - 1]
          const showAvatar = !isMe && (!prevMsg || prevMsg.sender !== "them" || prevMsg.isSystem)

          return (
            <div key={msg.id} className={`flex items-end gap-2 group ${isMe ? "justify-end" : "justify-start"}`}>
              {/* Their avatar */}
              {!isMe && (
                <div className="w-7 flex-shrink-0">
                  {showAvatar ? (
                    <img src={recipient.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : null}
                </div>
              )}

              <div className={`relative max-w-[75%] sm:max-w-[65%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                {/* Bubble */}
                <div
                  className={`relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm cursor-pointer ${
                    isMe
                      ? "bg-brand text-white rounded-tr-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                  }`}
                  onDoubleClick={() => setReactionFor(reactionFor === msg.id ? null : msg.id)}
                >
                  {msg.text}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <span className="absolute -bottom-3 -right-1 flex rounded-full bg-white border border-gray-100 shadow-sm px-1.5 py-0.5 text-xs">
                      {msg.reactions.join("")}
                    </span>
                  )}
                </div>

                {/* Reaction picker */}
                {reactionFor === msg.id && (
                  <div className={`absolute -top-9 ${isMe ? "right-0" : "left-0"} z-20 flex gap-1 bg-white rounded-full border border-gray-200 shadow-lg px-2 py-1`}>
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => {
                        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: [e] } : m))
                        setReactionFor(null)
                      }} className="text-lg hover:scale-125 transition-transform">{e}</button>
                    ))}
                  </div>
                )}

                {/* Time + status */}
                <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                  <span className="text-[10px] text-gray-400">{msg.time}</span>
                  {isMe && msg.status && (
                    <span className="flex-shrink-0">
                      {msg.status === "sent" && <Check className="h-3 w-3 text-gray-400" />}
                      {msg.status === "delivered" && <CheckCheck className="h-3 w-3 text-gray-400" />}
                      {msg.status === "read" && <CheckCheck className="h-3 w-3 text-blue-400" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <img src={recipient.avatar} alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="fixed bottom-24 right-4 z-20 h-9 w-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand transition-colors"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Message Input */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 sm:px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            <label className="p-2 rounded-full text-gray-400 hover:text-brand hover:bg-gray-100 transition-colors cursor-pointer">
              <Paperclip className="h-5 w-5" />
              <input type="file" className="sr-only" />
            </label>
            <label className="p-2 rounded-full text-gray-400 hover:text-brand hover:bg-gray-100 transition-colors cursor-pointer">
              <ImageIcon className="h-5 w-5" />
              <input type="file" accept="image/*" className="sr-only" />
            </label>
          </div>

          <div className="flex-1 flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/10 transition-all min-h-[42px]">
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Write a message…"
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 resize-none"
            />
            <button className="flex-shrink-0 text-gray-400 hover:text-amber-500 transition-colors">
              <Smile className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={sendMessage}
            className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm ${inputText.trim() ? "bg-brand hover:bg-brand-600 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            disabled={!inputText.trim()}
          >
            {inputText.trim() ? <Send className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
