"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { unblockUserAction } from "@/app/(main)/messages/actions"
import type { BlockedUserRow } from "@/modules/connections/blocks"

/** "Blocked accounts" settings section — lists everyone the viewer has blocked
 *  with an Unblock control (audit P0-7: block previously had no reverse). */
export function BlockedAccounts({ initial }: { initial: BlockedUserRow[] }) {
  const [rows, setRows] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function unblock(id: string) {
    setBusyId(id)
    startTransition(async () => {
      const res = await unblockUserAction(id)
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id))
      setBusyId(null)
    })
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Blocked accounts</h2>
      <p className="text-sm text-gray-500 mb-4">
        Blocked members can’t see your profile, posts, or comments, and can’t message or follow you.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">You haven’t blocked anyone.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <Image
                src={u.photoUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
                unoptimized
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                {u.username && <p className="truncate text-xs text-gray-500">@{u.username}</p>}
              </div>
              <button
                onClick={() => unblock(u.id)}
                disabled={pending && busyId === u.id}
                className="rounded-[4px] border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {pending && busyId === u.id ? "Unblocking…" : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
