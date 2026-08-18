"use client"

import { VerifiedTick } from "@/components/shared/VerifiedTick"
import { useDropdown } from "@/components/shared/feed-card/use-dropdown"

/** "Verified since August 2026" tail, or null if we don't have a date. */
export function formatVerifiedSince(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

/**
 * Clickable verified seal that opens an X-style detail popover
 * ("Verified account · This account is verified · Verified since …").
 * Click-outside closes it (shared useDropdown).
 */
export function VerifiedBadge({
  membership,
  membershipLabel,
  verifiedOn,
  size = 20,
}: {
  membership?: string | null
  membershipLabel?: string | null
  verifiedOn?: string | null
  size?: number
}) {
  const { open, setOpen, ref } = useDropdown()
  const since = formatVerifiedSince(verifiedOn)

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Verified account — view details"
        aria-expanded={open}
        className="inline-flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <VerifiedTick size={size} membership={membership} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Verified account details"
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <VerifiedTick size={22} membership={membership} />
            <span className="font-heading text-[15px] font-bold text-gray-900">Verified account</span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
            This account is verified as a genuine member of the JNV Nagpur alumni network
            {membershipLabel ? ` (${membershipLabel})` : ""}.
          </p>
          {since && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-500">
              <CalendarGlyph /> Verified since {since}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function CalendarGlyph() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" className="flex-shrink-0" aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
