"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ShieldCheck } from "lucide-react"
import EmojiPicker from "@/components/shared/EmojiPicker"
import type { MentionTarget } from "@/modules/feed/comments"

interface Props {
  value: string
  onChange: (v: string) => void
  onEnter?: () => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  multiline?: boolean
  autoFocus?: boolean
  disabled?: boolean
  rows?: number
  className?: string
  hideEmoji?: boolean
  maxLength?: number
  style?: React.CSSProperties
}

const TOKEN_RE = /(^|\s)@(\w{0,20})$/

// Module-level cache shared across all MentionInput instances in the session.
type MentionCache = { items: MentionTarget[]; followedIds: Set<string> } | null
let _cache: MentionCache = null
let _loading: Promise<MentionCache> | null = null

function loadMentionCache(): Promise<MentionCache> {
  if (_cache) return Promise.resolve(_cache)
  if (_loading) return _loading
  _loading = fetch("/api/mentions")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d) {
        _cache = { items: d.items, followedIds: new Set(d.followedIds as string[]) }
      }
      return _cache
    })
    .catch(() => null)
  return _loading
}

function filterMentions(
  all: MentionTarget[],
  followedIds: Set<string>,
  query: string,
  limit = 8,
): MentionTarget[] {
  const q = query.toLowerCase()
  const matched = q
    ? all.filter(
        (t) =>
          (t.displayName?.toLowerCase().includes(q)) ||
          (t.username?.toLowerCase().includes(q)),
      )
    : all

  // Rank: followed first, then the rest
  const followed: MentionTarget[] = []
  const rest: MentionTarget[] = []
  for (const t of matched) {
    if (followedIds.has(t.id)) followed.push(t)
    else rest.push(t)
  }
  return [...followed, ...rest].slice(0, limit)
}

export default function MentionInput({
  value,
  onChange,
  onEnter,
  onFocus,
  onBlur,
  placeholder,
  multiline,
  autoFocus,
  disabled,
  rows = 2,
  className = "",
  hideEmoji = false,
  maxLength,
  style,
}: Props) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const [caret, setCaret] = useState(0)
  const [items, setItems] = useState<MentionTarget[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const tokenStart = useRef(0)
  const cacheRef = useRef(_cache)

  // Eagerly load the user cache on mount
  useEffect(() => {
    loadMentionCache().then((c) => { cacheRef.current = c })
  }, [])

  useEffect(() => {
    const before = value.slice(0, caret)
    const m = before.match(TOKEN_RE)
    if (!m) {
      setOpen(false)
      return
    }
    tokenStart.current = m.index! + m[1].length
    const q = m[2]

    const cache = cacheRef.current
    if (cache) {
      const results = filterMentions(cache.items, cache.followedIds, q)
      setItems(results)
      setActive(0)
      setOpen(results.length > 0)
    } else {
      // Cache still loading — wait for it, then filter
      loadMentionCache().then((c) => {
        if (!c) return
        cacheRef.current = c
        const results = filterMentions(c.items, c.followedIds, q)
        setItems(results)
        setActive(0)
        setOpen(results.length > 0)
      })
    }
  }, [value, caret])

  function pick(t: MentionTarget) {
    const handle = t.username ?? t.displayName.replace(/\s+/g, "")
    const next = `${value.slice(0, tokenStart.current)}@${handle} ${value.slice(caret)}`
    onChange(next)
    setOpen(false)
    const pos = tokenStart.current + handle.length + 2
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(pos, pos)
      setCaret(pos)
    })
  }

  function syncCaret() {
    setCaret(ref.current?.selectionStart ?? 0)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActive((i) => (i + 1) % items.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActive((i) => (i - 1 + items.length) % items.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        pick(items[active])
        return
      }
      if (e.key === "Escape") {
        setOpen(false)
        return
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !multiline && onEnter) {
      e.preventDefault()
      onEnter()
    }
  }

  const shared = {
    ref,
    value,
    disabled,
    autoFocus,
    placeholder,
    maxLength,
    style,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      onChange(e.target.value)
      setCaret(e.target.selectionStart ?? 0)
    },
    onKeyUp: syncCaret,
    onClick: syncCaret,
    onKeyDown,
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
    className: hideEmoji ? className : `${className} pr-9`,
  }

  return (
    <div className="relative flex-1">
      {multiline ? (
        <textarea {...shared} rows={rows} />
      ) : (
        <input {...shared} type="text" />
      )}

      {!hideEmoji && (
        <EmojiPicker
          className={`absolute right-2 ${multiline ? "bottom-2" : "top-1/2 -translate-y-1/2"}`}
          onPick={(e) => onChange(value + e)}
        />
      )}

      {open && (
        <ul className="absolute left-0 top-full z-20 mt-1 w-72 max-h-72 overflow-auto rounded-[5px] border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(t)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${
                  i === active ? "bg-brand-50" : "hover:bg-gray-50"
                }`}
              >
                <Image src={t.avatarUrl} alt="" className="h-8 w-8 rounded-[4px] object-cover" width={32} height={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {t.displayName}
                    </span>
                    {t.isVerified && (
                      <ShieldCheck className="h-3 w-3 shrink-0 text-blue-500 fill-blue-100" />
                    )}
                  </span>
                  {t.headline && (
                    <span className="block truncate text-xs text-gray-500">{t.headline}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
