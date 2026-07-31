"use client"

import { useState, useTransition } from "react"
import { EMAIL_PREF_KEYS, EMAIL_PREF_LABELS, type EmailPrefKey } from "./prefs"
import { updateEmailPrefsAction } from "./actions"

export default function EmailPrefsForm({ initial }: { initial: Record<EmailPrefKey, boolean> }) {
  const [prefs, setPrefs] = useState<Record<EmailPrefKey, boolean>>(initial)
  const [saving, startSave] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggle(k: EmailPrefKey) {
    setSaved(false)
    setPrefs(p => ({ ...p, [k]: !p[k] }))
  }

  function save() {
    startSave(async () => {
      await updateEmailPrefsAction(prefs)
      setSaved(true)
    })
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Email preferences</h2>
      <p className="text-sm text-gray-500 mb-4">
        Choose what we email you. Account &amp; security emails are always sent.
      </p>

      <ul className="divide-y divide-gray-100">
        {EMAIL_PREF_KEYS.map(k => (
          <li key={k} className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-800">{EMAIL_PREF_LABELS[k]}</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[k]}
              aria-label={EMAIL_PREF_LABELS[k]}
              onClick={() => toggle(k)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${prefs[k] ? "bg-brand-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs[k] ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
      </div>
    </section>
  )
}
