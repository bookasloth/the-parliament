"use client"

import { useState, useTransition } from "react"
import { UserPlus } from "lucide-react"
import { inviteFriendAction } from "./actions"

/** Compact member-invite form (audit P1-19): send a referral invite by email. */
export function InviteFriend() {
  const [email, setEmail] = useState("")
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function submit() {
    const e = email.trim()
    if (!e) return
    setMsg(null)
    startTransition(async () => {
      const res = await inviteFriendAction(e)
      if (res.ok) {
        setMsg({ ok: true, text: "Invite sent ✓" })
        setEmail("")
      } else {
        setMsg({ ok: false, text: res.error ?? "Couldn't send the invite." })
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold text-gray-900">Invite an alumnus</h3>
      </div>
      <p className="mb-3 text-xs text-gray-500">Know a JNV Nagpur alumnus who isn’t here yet? Send them an invite.</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="their@email.com"
          className="min-w-0 flex-1 rounded-[4px] border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
        <button
          onClick={submit}
          disabled={pending || !email.trim()}
          className="rounded-[4px] bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Invite"}
        </button>
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  )
}
