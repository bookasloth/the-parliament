"use client"

import Image from "next/image"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { notifVisual } from "@/modules/notifications/visuals"
import { othersSuffix } from "@/modules/notifications/aggregate"

// The one true notification row — rendered on the /notifications page (variant
// "full") and in the navbar bell dropdown (variant "compact"). Unifies what were
// two divergent mappers so both surfaces stay in sync.

export interface NotifView {
  id: string
  type: string
  title: string
  body: string | null
  imageUrl: string | null
  /** Avatars of the distinct actors folded into a coalesced row (for stacking). */
  actorAvatars: string[]
  actorCount: number
  isRead: boolean
  createdAt: string
  href: string
  ctas: { label: string; href: string; primary?: boolean }[]
}

function relative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}

/** Actor avatar with a coloured type badge (and a peeking second avatar when the
 *  row aggregates multiple actors). Falls back to the type glyph tile when there's
 *  no avatar image. */
function NotificationAvatar({ item, size }: { item: NotifView; size: number }) {
  const { Icon, bg } = notifVisual(item.type)
  const badge = Math.max(15, Math.round(size * 0.42))
  const secondary = item.actorAvatars.length > 1 ? item.actorAvatars[1] : null
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {secondary && (
        <Image
          src={secondary}
          alt=""
          width={Math.round(size * 0.6)}
          height={Math.round(size * 0.6)}
          className="absolute -left-1.5 -top-1.5 rounded-[3px] object-cover ring-2 ring-white"
          style={{ width: Math.round(size * 0.6), height: Math.round(size * 0.6) }}
        />
      )}
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt=""
          width={size}
          height={size}
          className="relative rounded-[4px] object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div className={`relative flex items-center justify-center rounded-[4px] text-white ${bg}`} style={{ width: size, height: size }}>
          <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
        </div>
      )}
      {/* Type badge — only when there's a real avatar (else the tile already shows the glyph). */}
      {item.imageUrl && (
        <span
          className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full text-white ring-2 ring-white ${bg}`}
          style={{ width: badge, height: badge }}
        >
          <Icon style={{ width: badge * 0.6, height: badge * 0.6 }} />
        </span>
      )}
    </div>
  )
}

export function NotificationRow({
  item, variant = "full", onOpen, onDelete,
}: {
  item: NotifView
  variant?: "full" | "compact"
  /** Called when the row (or a CTA) is opened — used to optimistically mark read. */
  onOpen: (id: string) => void
  /** Full variant only: delete this row. */
  onDelete?: (id: string) => void
}) {
  const compact = variant === "compact"
  const avatarSize = compact ? 40 : 44
  const suffix = othersSuffix(item.actorCount)

  return (
    <div
      className={`group relative rounded-[5px] transition-colors ${compact ? "p-2.5" : "p-3 pr-9"} ${
        item.isRead ? "hover:bg-gray-50" : "bg-brand/5 hover:bg-brand/10"
      }`}
    >
      {!item.isRead && (
        <span className={`absolute ${compact ? "right-2 top-1/2 -translate-y-1/2" : "right-3 top-1/2 -translate-y-1/2"} h-2 w-2 rounded-full bg-brand`} />
      )}
      <Link href={item.href} onClick={() => onOpen(item.id)} className="flex gap-3">
        <NotificationAvatar item={item} size={avatarSize} />
        <div className="min-w-0 flex-1">
          <p className={`${compact ? "text-xs" : "text-sm"} font-medium leading-snug text-gray-900`}>
            {item.title}
            {suffix && <span className="font-normal text-gray-500"> {suffix}</span>}
          </p>
          {item.body && (
            <p className={`${compact ? "text-[11px]" : "text-sm"} mt-0.5 leading-snug text-gray-600 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>
              {item.body}
            </p>
          )}
          <span className={`${compact ? "text-[10px]" : "text-[11px]"} mt-0.5 block text-gray-400`}>{relative(item.createdAt)}</span>
        </div>
      </Link>

      {item.ctas.length > 0 && (
        <div className={`mt-2 flex flex-wrap gap-1.5 ${compact ? "pl-[52px]" : "pl-[56px]"}`}>
          {item.ctas.map((c) => (
            <Link
              key={c.label + c.href}
              href={c.href}
              onClick={() => onOpen(item.id)}
              className={
                c.primary
                  ? `rounded-[3px] bg-brand font-semibold text-white hover:bg-brand-600 ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs"}`
                  : `rounded-[3px] border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs"}`
              }
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}

      {!compact && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
          className="absolute right-2 top-2 rounded-[3px] p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          aria-label="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
