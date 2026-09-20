"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Send, Smile, ImagePlus } from "lucide-react"
import { SHUBHAM_DATARKAR_AD, sponsorHref } from "@/config/sponsor-ads"
import { trackAdClick } from "@/lib/ad-beacon"
import { ChatDecorations } from "@/components/shared/ChatDecorations"
import { getActiveTheme } from "@/config/chat-themes"

// The sponsor's "message", opened from the Sponsored row in the chat list.
// Rendered to look like a REAL conversation — same header, same received bubbles
// (avatar + left-aligned, live chat theme) as ConversationView — so it reads like
// the advertiser actually messaged you. Still clearly an ad: a Sponsored divider,
// the CTA, and a disabled composer ("you can't reply").
export default function SponsoredMessagePage() {
  const ad = SHUBHAM_DATARKAR_AD
  const href = sponsorHref("alerts")
  const theme = getActiveTheme(new Date())
  const isDark = theme.dark ?? false
  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  // The pitch as a short back-to-back chat, newest last (like a real thread).
  const messages = [
    "Hi 👋",
    ad.tagline,
    "If you run a business (or plan to), let's get you a website that actually converts — plus the SEO & ads to get found.",
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header — mirrors ConversationView */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/messages" className="lg:hidden p-1 -ml-1 text-gray-500 hover:text-brand" aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Image src={ad.avatarUrl} alt={ad.advertiser} width={40} height={40} className="h-10 w-10 rounded-[4px] object-cover flex-shrink-0" />
          <div className="min-w-0">
            <h6 className="truncate text-sm font-semibold text-gray-900">{ad.advertiser}</h6>
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide leading-tight text-emerald-600">Sponsored</p>
          </div>
        </div>
      </div>

      {/* Conversation content — same container + theme as a real chat */}
      <div
        className="relative flex-1 overflow-y-auto px-3 sm:px-5 py-4"
        style={theme.conversationBackground ? { background: theme.conversationBackground } : undefined}
      >
        <ChatDecorations decoration={theme.decoration} />

        <div className="relative z-10 space-y-1">
          {/* Sponsored divider — keeps it honest without breaking the chat feel */}
          <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium" style={{ color: theme.dividerColor }}>
            Sponsored message
          </div>

          {messages.map((text, i) => {
            const isLast = i === messages.length - 1
            return (
              <div key={i} className="group">
                <div className="flex mb-1 items-end gap-2">
                  <Image src={ad.avatarUrl} alt="" width={24} height={24} className="h-6 w-6 rounded-[3px] object-cover flex-shrink-0 mb-5" />
                  <div className="flex flex-col items-start max-w-[78%] sm:max-w-[65%]">
                    <div
                      className="relative rounded-[5px] px-3.5 py-2 text-sm leading-relaxed shadow-sm"
                      style={{ background: theme.received.background, color: theme.received.color }}
                    >
                      {text}
                      {/* CTA rides the last bubble, like a rich message */}
                      {isLast && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          onClick={() => trackAdClick(ad.id, "alerts")}
                          className="mt-2.5 inline-flex items-center gap-1.5 rounded-[4px] bg-brand px-3.5 py-1.5 text-sm font-bold text-white hover:bg-brand-600"
                        >
                          {ad.cta} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <span className="mt-1.5 text-[10px]" style={{ color: isDark ? "#9c8a6b" : "#94a3b8" }}>
                      {now}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Composer — present but disabled: you can't reply to a sponsored chat */}
      <div className="border-t border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-end gap-2 rounded-[5px] border border-gray-200 bg-gray-50 px-2 py-1.5 opacity-60">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] text-gray-300">
            <ImagePlus className="h-4.5 w-4.5" />
          </span>
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] text-gray-300">
            <Smile className="h-4.5 w-4.5" />
          </span>
          <input
            disabled
            placeholder="You can't reply to a sponsored chat"
            className="w-full cursor-not-allowed resize-none bg-transparent px-2 py-1.5 text-sm text-gray-500 outline-none placeholder:text-gray-400"
          />
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] bg-gray-200 text-gray-400">
            <Send className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  )
}
