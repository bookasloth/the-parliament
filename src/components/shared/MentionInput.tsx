"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { VerifiedTick } from "@/components/shared/VerifiedTick"
import { searchMentionsAction } from "@/app/(main)/feed/actions"
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
  /** Fire onEnter on Enter even when multiline (Shift+Enter still inserts a newline). For chat-style send-on-enter. */
  enterSubmits?: boolean
  /** Grow a multiline textarea with its content, capped at 120px. */
  autoGrow?: boolean
  /** Open the suggestion list upward (composer pinned to the viewport bottom). */
  dropUp?: boolean
}

const TOKEN_RE = /(^|\s)@(\w{0,20})$/

// Pixel position of a character index inside a textarea/input, relative to the
// field's own top-left (padding box). Uses the classic hidden-mirror technique:
// a div styled identically to the field, holding the text up to `pos`, with a
// marker span whose offset IS the caret position. Lets us anchor the mention
// dropdown right under the "@" instead of at the bottom of the box.
const MIRROR_PROPS = [
  "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize", "fontFamily",
  "lineHeight", "letterSpacing", "textTransform", "wordSpacing", "textIndent",
] as const

function caretCoords(el: HTMLTextAreaElement | HTMLInputElement, pos: number): { left: number; top: number } {
  const s = getComputedStyle(el)
  const div = document.createElement("div")
  div.style.position = "absolute"
  div.style.visibility = "hidden"
  div.style.whiteSpace = "pre-wrap"
  div.style.overflowWrap = "break-word"
  for (const p of MIRROR_PROPS) div.style[p as never] = s[p as never]
  // <input> is single-line: don't wrap.
  if (el.tagName === "INPUT") div.style.whiteSpace = "pre"
  div.textContent = el.value.slice(0, pos)
  const span = document.createElement("span")
  span.textContent = el.value.slice(pos) || "."
  div.appendChild(span)
  document.body.appendChild(div)
  const left = span.offsetLeft - el.scrollLeft
  const top = span.offsetTop - el.scrollTop
  document.body.removeChild(div)
  return { left, top }
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
  enterSubmits = false,
  autoGrow = false,
  dropUp = false,
}: Props) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const [caret, setCaret] = useState(0)
  const [items, setItems] = useState<MentionTarget[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null)
  const [active, setActive] = useState(0)
  const tokenStart = useRef(0)
  // Per-session cache of query → results, so backspacing/retyping a handle is
  // instant instead of another server round-trip.
  const cacheRef = useRef<Map<string, MentionTarget[]>>(new Map())

  useEffect(() => {
    // This effect derives the dropdown's open/loading/position state from the
    // current value+caret (plus a debounced fetch); the synchronous setState is
    // the intended synchronization, not a cascading-render bug.
    /* eslint-disable react-hooks/set-state-in-effect */
    const before = value.slice(0, caret)
    const m = before.match(TOKEN_RE)
    if (!m) {
      setOpen(false)
      setLoading(false)
      return
    }
    tokenStart.current = m.index! + m[1].length
    const q = m[2]
    const key = q.toLowerCase()

    // Anchor the dropdown right under the "@" glyph (not the bottom of the box).
    if (ref.current) {
      const c = caretCoords(ref.current, tokenStart.current)
      const lh = parseFloat(getComputedStyle(ref.current).lineHeight) || 20
      setMenuPos({ left: c.left, top: c.top + lh })
    }

    // Cache hit → show immediately, no fetch, no skeleton.
    const cached = cacheRef.current.get(key)
    if (cached) {
      setItems(cached)
      setActive(0)
      setLoading(false)
      setOpen(cached.length > 0 || q.length >= 2)
      return
    }

    // Skeleton the instant a real query (2+ chars) starts — before the debounce
    // and network — so it feels responsive while results load.
    if (q.length >= 2) {
      setLoading(true)
      setOpen(true)
    }

    let live = true
    const t = setTimeout(async () => {
      try {
        const res = await searchMentionsAction(q)
        cacheRef.current.set(key, res)
        if (!live) return
        setItems(res)
        setActive(0)
        setLoading(false)
        setOpen(res.length > 0 || q.length >= 2)
      } catch (err) {
        console.error("[MentionInput] search failed", err)
        if (live) {
          setLoading(false)
          setOpen(false)
        }
      }
    }, 150)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [value, caret])
  /* eslint-enable react-hooks/set-state-in-effect */

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

  // Grow with content (chat composer), capped so it never eats the viewport.
  useEffect(() => {
    if (!autoGrow || !multiline || !ref.current) return
    const el = ref.current
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value, autoGrow, multiline])

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
    if (e.key === "Enter" && !e.shiftKey && onEnter && (!multiline || enterSubmits)) {
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
        <ul
          className={`absolute z-20 w-72 max-h-72 overflow-auto rounded-[5px] border border-gray-200 bg-white py-1 shadow-lg ${
            menuPos ? "" : dropUp ? "left-0 bottom-full mb-1" : "left-0 top-full mt-1"
          }`}
          style={
            menuPos
              ? dropUp
                ? { left: menuPos.left, bottom: `calc(100% - ${menuPos.top}px)` }
                : { left: menuPos.left, top: menuPos.top }
              : undefined
          }
        >
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={`sk-${i}`} className="flex items-center gap-2.5 px-3 py-2">
                <span className="h-8 w-8 shrink-0 animate-pulse rounded-[4px] bg-gray-200" />
                <span className="min-w-0 flex-1">
                  <span className="block h-3 w-28 animate-pulse rounded bg-gray-200" />
                  <span className="mt-1.5 block h-2.5 w-20 animate-pulse rounded bg-gray-100" />
                </span>
              </li>
            ))}

          {!loading && items.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">No people found</li>
          )}

          {!loading &&
            items.map((t, i) => (
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
                    {t.isVerified && <VerifiedTick size={13} membership={t.membership} />}
                  </span>
                  {(t.batchLabel || t.headline) && (
                    <span className="block truncate text-xs text-gray-500">{t.batchLabel ?? t.headline}</span>
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
