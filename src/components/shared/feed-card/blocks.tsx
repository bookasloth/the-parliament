"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Eye, Clock, Quote, Globe } from "lucide-react"
import type { FeedPost, FeedMembership } from "./types"
import { truncateForPreview } from "@/lib/text-preview"

const G_GRADIENT = "linear-gradient(90deg,#4285F4,#EA4335,#FBBC05,#34A853)"
function GoogleColoredMention({ handle }: { handle: string }) {
  return (
    <Link
      href={`/${handle.slice(1)}`}
      className="inline font-semibold hover:underline"
      style={{ backgroundImage: G_GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
    >
      {handle}
    </Link>
  )
}

// Shared token renderer for post body text: @mentions, #hashtags, links. `onBg`
// = rendered over a colored text-background post, where gradient-fill text would
// be unreadable — mentions/tags stay solid + underlined and inherit the bg's fg.
function renderTokens(text: string, onBg = false) {
  return text.split(/(@\w+|#\w+|https?:\/\/\S+)/g).map((part, i) => {
    if (part.startsWith("@")) {
      return onBg ? (
        <Link key={i} href={`/${part.slice(1)}`} className="font-bold underline underline-offset-2 hover:opacity-80">{part}</Link>
      ) : (
        <GoogleColoredMention key={i} handle={part} />
      )
    }
    if (part.startsWith("#")) {
      return (
        <Link key={i} href={`/hashtag/${part.slice(1)}`} className={onBg ? "font-bold underline underline-offset-2 hover:opacity-80" : "text-brand font-medium hover:underline"}>{part}</Link>
      )
    }
    if (part.startsWith("http")) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={onBg ? "underline hover:opacity-80" : "text-brand hover:underline"}>{part}</a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// Inline (no wrapping <p>) variant — used inside the text-background post's own
// styled <p> so mentions/tags/links are clickable there too.
export function RichTextInline({ text, onBg = false }: { text: string; onBg?: boolean }) {
  return <>{renderTokens(text, onBg)}</>
}

// Scalloped verified seal (Twitter-style 24pt burst) + check, styled per tier:
// life = solid gold / black tick, student = green, premium = solid blue,
// associate = blue outline ("liner"). Others fall back to solid blue.
const SEAL_PATH =
  "M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"

const BADGE_STYLES: Record<FeedMembership, { seal: string; check: string; liner?: boolean }> = {
  life: { seal: "#E0A400", check: "#000000" }, // solid gold, black tick
  student: { seal: "#16A34A", check: "#ffffff" }, // green
  premium: { seal: "#009ae4", check: "#ffffff" }, // solid blue
  associate: { seal: "#009ae4", check: "#009ae4", liner: true }, // blue outline
  committee: { seal: "#009ae4", check: "#ffffff" },
  inactive: { seal: "#94a3b8", check: "#ffffff" },
}

// --- Verified badge ---
export function VerifiedBadge({ membership = "premium" }: { membership?: FeedMembership }) {
  const s = BADGE_STYLES[membership] ?? BADGE_STYLES.premium
  return (
    <span className="group relative inline-flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" aria-hidden>
        <path
          d={SEAL_PATH}
          fill={s.liner ? "none" : s.seal}
          stroke={s.liner ? s.seal : "none"}
          strokeWidth={s.liner ? 1.4 : 0}
        />
        <path
          d="M8.6 12.4l2.3 2.3 4.6-5"
          fill="none"
          stroke={s.check}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-[3px] bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg">
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

  const topVotes = Math.max(0, ...options.map((o) => o.votes))
  return (
    <div className="rounded-[5px] border border-gray-100 bg-gray-50/50 p-3.5">
      <p className="mb-3 text-sm font-semibold text-gray-900">{poll.question}</p>
      <div className="space-y-2">
        {options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
          const isMine = myOptionId === opt.id
          const isTop = revealed && total > 0 && opt.votes === topVotes
          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={poll.isClosed || revealed}
              className={`group relative flex h-11 w-full items-center overflow-hidden rounded-[4px] border px-3 text-left text-sm transition-all ${
                isMine ? "border-brand" : "border-gray-200"
              } ${!revealed && !poll.isClosed ? "hover:border-brand hover:bg-brand-50/40" : "cursor-default"}`}
            >
              {/* Result fill */}
              <div
                className={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-out ${
                  isMine ? "bg-brand-100" : isTop ? "bg-gray-200/70" : "bg-gray-100"
                }`}
                style={{ width: revealed ? `${pct}%` : "0%" }}
              />
              <div className="relative flex w-full items-center justify-between gap-2">
                <span className={`flex items-center gap-1.5 truncate ${isMine ? "font-semibold text-brand-700" : "font-medium text-gray-700"}`}>
                  {isMine && (
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] bg-brand">
                      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5"><path d="M5 13l4 4L19 7" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                  {opt.label}
                </span>
                {revealed && <span className={`flex-shrink-0 text-xs font-bold tabular-nums ${isTop ? "text-gray-900" : "text-gray-500"}`}>{pct}%</span>}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 text-xs font-medium text-gray-400">
        {total} {total === 1 ? "vote" : "votes"}
        {poll.isClosed ? " · Final results" : revealed ? " · You voted" : " · Tap an option to vote"}
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
  return (
    <p className="text-sm md:text-[15px] text-[#374151] leading-[1.7] whitespace-pre-line">
      {renderTokens(shown)}
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
    <div className="relative mt-3 overflow-hidden rounded-[4px]">
      <Image
        src={image}
        alt="Post media"
        width={0}
        height={0}
        sizes="(max-width: 768px) 100vw, 600px"
        className="w-full h-auto max-h-[500px] object-cover"
      />
      {mediaCount && mediaCount > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-[3px] bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5" />
          <span>+{mediaCount - 1} Photos</span>
        </div>
      )}
      {videoDuration && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-[3px] bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Clock className="h-3 w-3" />
          <span>{videoDuration}</span>
        </div>
      )}
    </div>
  )
}

// --- Link Preview (OG) Card ---
export function LinkPreviewCard({ link }: { link: NonNullable<FeedPost["link"]> }) {
  let host = link.url
  try {
    host = new URL(link.url).hostname.replace(/^www\./, "")
  } catch {
    /* keep raw url as the host label */
  }
  const hasMeta = !!(link.title || link.description || link.image)
  // No OG metadata → degrade to a plain, bare link chip (today's behaviour).
  if (!hasMeta) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-3 rounded-[4px] border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
      >
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[4px] bg-brand-50 text-brand">
          <Globe className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-gray-800">{host}</div>
          <div className="truncate text-xs text-gray-500">{link.url}</div>
        </div>
      </a>
    )
  }
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block overflow-hidden rounded-[4px] border border-gray-200 hover:border-gray-300 transition-colors"
    >
      {link.image && (
        // External OG image — plain <img> avoids next/image remote-host config.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={link.image} alt="" className="max-h-[260px] w-full object-cover" loading="lazy" />
      )}
      <div className="bg-gray-50 px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {link.siteName || host}
        </div>
        {link.title && (
          <div className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900">{link.title}</div>
        )}
        {link.description && (
          <div className="mt-1 line-clamp-2 text-xs text-gray-500">{link.description}</div>
        )}
      </div>
    </a>
  )
}

// --- Quote Block ---
export function QuoteBlock({ quote }: { quote: { text: string; author: string; source?: string } }) {
  return (
    <div className="relative mt-2 rounded-[5px] bg-brand p-6">
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
