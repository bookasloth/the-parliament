"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Check } from "lucide-react"
import { toggleFollowAction } from "./actions"

// Page-level follow (LinkedIn "Follow company"). Guests are bounced to sign-in;
// members toggle with optimistic count. `initialFollowing` is null for guests.
export function BusinessFollowButton({
  slug,
  initialFollowing,
}: {
  slug: string
  initialFollowing: boolean | null
  /** Kept for API symmetry with the header meta; count is shown there, not here. */
  initialCount?: number
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(!!initialFollowing)
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (initialFollowing === null) {
      router.push(`/auth/signin?callbackUrl=/business/${slug}`)
      return
    }
    setBusy(true)
    const next = !following
    setFollowing(next) // optimistic
    try {
      const r = await toggleFollowAction(slug)
      setFollowing(r.ok ? r.following : !next)
    } catch {
      setFollowing(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1.5 rounded-[4px] border px-[18px] py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
        following
          ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          : "border-brand bg-brand text-white hover:bg-brand-600"
      }`}
    >
      {following ? <><Check className="h-4 w-4" /> Following</> : <><Plus className="h-4 w-4" /> Follow</>}
    </button>
  )
}
