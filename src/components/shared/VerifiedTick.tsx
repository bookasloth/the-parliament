// Twitter/Facebook-style verified badge — a solid colored circle with a white
// tick. Never a shield. Color defaults to the brand blue; pass a tier accent to
// colour it per membership.
export function VerifiedTick({ color = "#009ae4", size = 16 }: { color?: string; size?: number }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: color, width: size, height: size }}
      aria-label="Verified"
      title="Verified"
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden>
        <path d="M5 12.5l4 4L19 7" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
