"use client"

import { useState } from "react"
import Image from "next/image"
import { Eye, Clock, Quote, Check } from "lucide-react"
import type { FeedPost } from "./types"
import { truncateForPreview } from "@/lib/text-preview"

// --- Verified badge (filled blue square + check) ---
export function VerifiedBadge() {
  return (
    <span className="group relative inline-flex h-[15px] w-[15px] items-center justify-center rounded-[4px] bg-brand text-white">
      <Check className="h-[11px] w-[11px]" strokeWidth={3} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg">
        Verified Alumni
      </span>
    </span>
  )
}

// --- Poll Card ---
export function PollCard({
  poll,
  onVote,
}: {
  poll: NonNullable<FeedPost["poll"]>
  onVote?: (optionId: string) => void | Promise<unknown>
}) {
  const [myOptionId, setMyOptionId] = useState<string | null>(poll.myOptionId ?? null)
  const [options, setOptions] = useState(poll.options)
  const total = options.reduce((s, o) => s + o.votes, 0)
  const revealed = myOptionId != null || !!poll.isClosed

  function vote(optionId: string) {
    if (poll.isClosed || myOptionId === optionId) return
    const prevOption = myOptionId
    // Optimistic: shift the tally, then persist.
    setOptions((prev) =>
      prev.map((o) => {
        let v = o.votes
        if (o.id === prevOption) v -= 1
        if (o.id === optionId) v += 1
        return { ...o, votes: v }
      }),
    )
    setMyOptionId(optionId)
    if (onVote && poll.id) {
      Promise.resolve(onVote(optionId)).catch(() => {
        // Roll back on failure.
        setOptions(poll.options)
        setMyOptionId(prevOption)
      })
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-900 mb-3">{poll.question}</p>
      <div className="space-y-2">
        {options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
          const isMine = myOptionId === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={poll.isClosed}
              className={`relative w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all overflow-hidden ${
                isMine
                  ? "border-brand bg-brand-50"
                  : revealed
                  ? "border-gray-200 opacity-80"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              } ${poll.isClosed ? "cursor-default" : ""}`}
            >
              <div
                className="absolute inset-0 bg-brand-50/40 transition-all"
                style={{ width: revealed ? `${pct}%` : "0%" }}
              />
              <div className="relative flex items-center justify-between">
                <span className={isMine ? "font-medium text-brand-700" : "text-gray-600"}>
                  {opt.label}
                </span>
                {revealed && <span className="text-xs font-medium text-gray-500">{pct}%</span>}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {total} {total === 1 ? "vote" : "votes"}
        {poll.isClosed ? " · closed" : revealed ? "" : " · tap an option to vote"}
      </p>
    </div>
  )
}

// --- Rich Text Renderer ---
export function RichText({ text, collapsible = false }: { text: string; collapsible?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const { shown, truncated } = collapsible && !expanded
    ? truncateForPreview(text)
    : { shown: text, truncated: false }
  const parts = shown.split(/(@\w+|#\w+|https?:\/\/\S+)/g)
  return (
    <p className="text-sm md:text-[15px] text-[#374151] leading-[1.7] whitespace-pre-line">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <button key={i} className="text-brand font-medium hover:underline">
              {part}
            </button>
          )
        }
        if (part.startsWith("#")) {
          return (
            <button key={i} className="text-brand font-medium hover:underline">
              {part}
            </button>
          )
        }
        if (part.startsWith("http")) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              {part}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
      {truncated && (
        <button
          onClick={() => setExpanded(true)}
          className="ml-1 font-medium text-gray-500 hover:text-brand hover:underline"
        >
          see more
        </button>
      )}
    </p>
  )
}

// --- Media Section ---
export function MediaSection({ image, mediaCount, videoDuration }: { image: string; mediaCount?: number; videoDuration?: string }) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-lg">
      <Image
        src={image}
        alt="Post media"
        width={0}
        height={0}
        sizes="(max-width: 768px) 100vw, 600px"
        className="w-full h-auto max-h-[500px] object-cover"
      />
      {mediaCount && mediaCount > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5" />
          <span>+{mediaCount - 1} Photos</span>
        </div>
      )}
      {videoDuration && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Clock className="h-3 w-3" />
          <span>{videoDuration}</span>
        </div>
      )}
    </div>
  )
}

// --- Quote Block ---
export function QuoteBlock({ quote }: { quote: { text: string; author: string; source?: string } }) {
  return (
    <div className="relative mt-2 rounded-xl bg-brand p-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Quote className="h-6 w-6 text-white/70" />
        </div>
        <div>
          <p className="text-base md:text-lg text-white leading-relaxed font-medium">
            {quote.text}
          </p>
          <p className="mt-3 text-sm text-white/80">&mdash; {quote.author}</p>
        </div>
      </div>
    </div>
  )
}

// --- HelpCircle icon (used in question banner) ---
export function HelpCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}
