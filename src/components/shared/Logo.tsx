import { cn } from "@/lib/utils"

/**
 * The one NNAWCA logo. `LogoMark` is the standalone multicolor-N glyph (favicon,
 * avatars, tight spots); `Logo` is the mark + "NNAWCA" wordmark lockup used in
 * nav bars, footers, and the admin shell. Single source of truth — every surface
 * imports from here so the brand can never drift again.
 *
 * The glyph is a hand-built SVG approximation of the Google-style multicolor N
 * (blue left stem · red→yellow diagonal · green right stem). Swap the paths here
 * to update it everywhere at once. Keep `src/app/icon.svg` in sync for the tab
 * favicon (Next serves that file directly and can't import this component).
 */
// `mono` renders the whole glyph in `currentColor` (drop it on a dark surface with
// `text-white` for a white lockup); default is the multicolor brand mark.
export function LogoMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  const stemL = mono ? "currentColor" : "#4285F4"
  const stemR = mono ? "currentColor" : "#34A853"
  const diag = mono ? "currentColor" : "url(#nnawca-diag)"
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-8 w-8", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="NNAWCA"
    >
      {!mono && (
        <defs>
          <linearGradient id="nnawca-diag" x1="10.5" y1="12" x2="37.5" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EA4335" />
            <stop offset="0.55" stopColor="#FBBC05" />
            <stop offset="1" stopColor="#F9AB00" />
          </linearGradient>
        </defs>
      )}
      {/* left stem */}
      <rect x="6" y="8" width="9" height="32" rx="4.5" fill={stemL} />
      {/* right stem */}
      <rect x="33" y="8" width="9" height="32" rx="4.5" fill={stemR} />
      {/* diagonal */}
      <path d="M10.5 12 L37.5 36" stroke={diag} strokeWidth="9" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({
  label = "NNAWCA",
  showWordmark = true,
  markClassName,
  wordmarkClassName,
  className,
}: {
  label?: string
  showWordmark?: boolean
  markClassName?: string
  wordmarkClassName?: string
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      {showWordmark && (
        <span className={cn("font-bold tracking-tight", wordmarkClassName)}>{label}</span>
      )}
    </span>
  )
}
