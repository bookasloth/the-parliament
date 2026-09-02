"use client"

import { useState, useTransition } from "react"
import { updateNotificationPrefsAction } from "./actions"

interface Props {
  initial: { pushEnabled: boolean; mutedKinds: string[] }
  kinds: { kind: string; label: string }[]
}

/** Bell/push notification preferences (audit P1-5). A muted kind produces no bell
 *  row and no push; email for it is still governed by the email preferences. */
export function NotificationPrefsForm({ initial, kinds }: Props) {
  const [pushEnabled, setPushEnabled] = useState(initial.pushEnabled)
  const [muted, setMuted] = useState<Set<string>>(new Set(initial.mutedKinds))
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggleMute(kind: string) {
    setMuted((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
    setSaved(false)
  }

  function save() {
    setSaved(false)
    startTransition(async () => {
      await updateNotificationPrefsAction({ pushEnabled, mutedKinds: [...muted] })
      setSaved(true)
    })
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Notifications</h2>
      <p className="text-sm text-gray-500 mb-4">
        Turn off the alerts you don’t want. Muted types won’t show in your bell or push to your
        devices (emails are controlled separately below).
      </p>

      <label className="flex items-center justify-between py-2.5 border-b border-gray-100">
        <span className="text-sm text-gray-800">Push notifications to my devices</span>
        <input
          type="checkbox"
          checked={pushEnabled}
          onChange={(e) => { setPushEnabled(e.target.checked); setSaved(false) }}
          className="h-4 w-4"
        />
      </label>

      <ul className="mt-1">
        {kinds.map(({ kind, label }) => (
          <li key={kind} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-800">{label}</span>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              {muted.has(kind) ? "Muted" : "On"}
              <input
                type="checkbox"
                checked={!muted.has(kind)}
                onChange={() => toggleMute(kind)}
                aria-label={label}
                className="h-4 w-4"
              />
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-[4px] bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
      </div>
    </section>
  )
}
