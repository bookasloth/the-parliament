"use client"

import { useState, useTransition } from "react"
import { PROFILE_VISIBILITIES, type ProfileVisibility } from "@/modules/profile/privacy"
import { updateProfilePrivacyAction, type PrivacyInput } from "./actions"

const VISIBILITY_COPY: Record<ProfileVisibility, { label: string; desc: string }> = {
  public: { label: "Public", desc: "Anyone, including logged-out visitors and search engines, can see your profile." },
  alumni: { label: "Alumni only", desc: "Only signed-in JNV Nagpur alumni can see your full profile. Others are asked to sign in." },
  connections: { label: "Connections only", desc: "Only people you're connected with can see your profile." },
  private: { label: "Private", desc: "Only you can see your profile." },
}

const TOGGLES: { key: keyof Omit<PrivacyInput, "visibility">; label: string; hint: string }[] = [
  { key: "contactAlwaysShare", label: "Share my contact details with members", hint: "Lets signed-in members see your postal address. Off = only you." },
  { key: "showOnMap", label: "Show me on the alumni map", hint: "Include your location pin on the alumni map." },
  { key: "isPublicIndexed", label: "Let search engines index my profile", hint: "Only applies when your profile is Public." },
]

export default function PrivacyForm({ initial }: { initial: PrivacyInput }) {
  const [state, setState] = useState<PrivacyInput>(initial)
  const [saving, startSave] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setVisibility(v: ProfileVisibility) {
    setSaved(false); setError(null)
    setState((s) => ({ ...s, visibility: v }))
  }
  function toggle(k: keyof Omit<PrivacyInput, "visibility">) {
    setSaved(false); setError(null)
    setState((s) => ({ ...s, [k]: !s[k] }))
  }
  function save() {
    startSave(async () => {
      const r = await updateProfilePrivacyAction(state)
      if (r.ok) setSaved(true)
      else setError(r.error ?? "Could not save.")
    })
  }

  return (
    <section className="rounded-[5px] border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Privacy</h2>
      <p className="text-sm text-gray-500 mb-4">
        Control who can see your profile. Sensitive details (date of birth, blood group) are
        always private to you; contact details need the opt-in below.
      </p>

      <fieldset className="space-y-2">
        <legend className="sr-only">Profile visibility</legend>
        {PROFILE_VISIBILITIES.map((v) => (
          <label
            key={v}
            className={`flex cursor-pointer gap-3 rounded-[4px] border p-3 transition-colors ${
              state.visibility === v ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              checked={state.visibility === v}
              onChange={() => setVisibility(v)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">{VISIBILITY_COPY[v].label}</span>
              <span className="block text-xs text-gray-500">{VISIBILITY_COPY[v].desc}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
        {TOGGLES.map(({ key, label, hint }) => (
          <li key={key} className="flex items-center justify-between gap-4 py-3">
            <span>
              <span className="block text-sm text-gray-800">{label}</span>
              <span className="block text-xs text-gray-500">{hint}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={state[key]}
              aria-label={label}
              onClick={() => toggle(key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${state[key] ? "bg-brand-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${state[key] ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-[4px] bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save privacy settings"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </section>
  )
}
