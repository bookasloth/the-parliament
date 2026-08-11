// Twitter/Facebook-style verified badge — a scalloped (burst) seal with a white
// tick. Never a plain circle, never a shield. Color defaults to brand blue; pass
// a tier accent to colour it per membership.
const SEAL =
  "M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"

import { verifiedSealColor } from "@/config/membership-colors"

// Pass `membership` to colour the seal by tier (life = gold, …); `color` still
// overrides explicitly (sponsored/brand accents). Neither → brand blue.
export function VerifiedTick({ color, membership, size = 16 }: { color?: string; membership?: string | null; size?: number }) {
  const fill = color ?? verifiedSealColor(membership)
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="inline-block flex-shrink-0" aria-label="Verified" role="img">
      <path d={SEAL} fill={fill} />
      <path d="M8.6 12.4l2.3 2.3 4.6-5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
