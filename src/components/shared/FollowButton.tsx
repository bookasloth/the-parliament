"use client"

import { UserPlus, UserCheck, UserMinus, Check } from "lucide-react"
import { useFollow } from "./follow-store"

export function FollowButton({
  userId,
  initialFollowing = false,
  iconOnly = false,
}: {
  userId: string
  initialFollowing?: boolean
  /** Square icon-only button (mobile/compact). */
  iconOnly?: boolean
}) {
  const { following, toggle, busy } = useFollow(userId, initialFollowing)

  if (iconOnly) {
    const label = following ? "Following — click to unfollow" : "Follow"
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={label}
        title={label}
        className={`group flex h-11 w-11 items-center justify-center rounded-[4px] border transition-colors disabled:opacity-60 ${
          following
            ? "border-green-200 bg-green-50 text-green-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            : "border-brand bg-brand text-white hover:bg-brand-600"
        }`}
      >
        {following ? (
          <>
            {/* following = green user-tick; on hover = red user-minus (unfollow) */}
            <UserCheck className="h-5 w-5 group-hover:hidden" />
            <UserMinus className="hidden h-5 w-5 group-hover:block" />
          </>
        ) : (
          <UserPlus className="h-5 w-5" />
        )}
      </button>
    )
  }

  if (following) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        className="group flex items-center gap-1.5 rounded-[3px] border border-gray-200 bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600 transition-all duration-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        <Check className="h-3.5 w-3.5 group-hover:hidden" />
        <span className="hidden group-hover:inline">Unfollow</span>
        <span className="group-hover:hidden">Following</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-[3px] border border-brand bg-brand px-4 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:bg-white hover:text-brand disabled:opacity-60"
    >
      <UserPlus className="h-3.5 w-3.5" /> {busy ? "…" : "Follow"}
    </button>
  )
}
