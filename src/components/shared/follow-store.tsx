"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { followAction, unfollowAction } from "@/app/(main)/connections/actions"

type Store = { map: Map<string, boolean>; set: (id: string, v: boolean) => void }
const FollowCtx = createContext<Store | null>(null)

// App-wide follow state keyed by user id. Following a user from one place (a
// feed post, the community card, a profile) updates every other place instantly
// and optimistically. Wraps the gated app in (main)/layout.
export function FollowStoreProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<Map<string, boolean>>(() => new Map())
  const set = useCallback((id: string, v: boolean) => {
    setMap((prev) => {
      if (prev.get(id) === v) return prev
      const next = new Map(prev)
      next.set(id, v)
      return next
    })
  }, [])
  return <FollowCtx.Provider value={{ map, set }}>{children}</FollowCtx.Provider>
}

/**
 * Follow state + optimistic toggle for a single user id. Reads from the shared
 * store when a provider is present (so all cards for the same author stay in
 * sync); falls back to local state otherwise. `initial` seeds the value once.
 */
export function useFollow(userId: string | undefined, initial: boolean) {
  const ctx = useContext(FollowCtx)
  const [local, setLocal] = useState<Map<string, boolean>>(() => new Map())
  const map = ctx?.map ?? local
  const set = ctx?.set ?? ((id: string, v: boolean) => setLocal((p) => { const n = new Map(p); n.set(id, v); return n }))
  const [busy, setBusy] = useState(false)

  // Seed the store the first time we see this user (never overwrite a value the
  // user has already toggled elsewhere).
  useEffect(() => {
    if (userId && !map.has(userId)) set(userId, initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const following = userId && map.has(userId) ? !!map.get(userId) : initial

  const toggle = useCallback(async () => {
    if (!userId || busy) return
    const next = !following
    setBusy(true)
    set(userId, next) // optimistic
    try {
      await (next ? followAction(userId) : unfollowAction(userId))
    } catch {
      set(userId, !next) // revert
    } finally {
      setBusy(false)
    }
  }, [userId, busy, following, set])

  return { following, toggle, busy }
}
