"use client"

import { useState } from "react"
import { UserPlus, Check } from "lucide-react"
import { followAction, unfollowAction } from "@/app/(main)/connections/actions"

export function FollowButton({
  userId,
  initialFollowing = false,
}: {
  userId: string
  initialFollowing?: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    setBusy(true)
    const next = !following
    setFollowing(next) // optimistic
    try {
      await (next ? followAction(userId) : unfollowAction(userId))
    } catch {
      setFollowing(!next) // revert
    } finally {
      setBusy(false)
    }
  }

  if (following) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        className="group flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600 transition-all duration-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
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
      className="flex items-center gap-1.5 rounded-md border border-brand bg-brand px-4 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:bg-white hover:text-brand disabled:opacity-60"
    >
      <UserPlus className="h-3.5 w-3.5" /> {busy ? "…" : "Follow"}
    </button>
  )
}
