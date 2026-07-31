"use client"

import { useState, useTransition } from "react"
import { changePasswordAction } from "./actions"

export default function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    start(async () => {
      const r = await changePasswordAction({ current, next, confirm })
      if (r.ok) {
        setMsg({ ok: true, text: hasPassword ? "Password changed." : "Password set." })
        setCurrent(""); setNext(""); setConfirm("")
      } else {
        setMsg({ ok: false, text: r.error ?? "Something went wrong." })
      }
    })
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{hasPassword ? "Change password" : "Set a password"}</h2>
      {!hasPassword && (
        <p className="text-sm text-gray-500 mb-4">You signed in with Google. Set a password to also sign in with email.</p>
      )}
      <form onSubmit={submit} className="mt-2 space-y-3 max-w-sm">
        {hasPassword && (
          <Field label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
        )}
        <Field label="New password" value={next} onChange={setNext} autoComplete="new-password" />
        <Field label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</span>}
        </div>
      </form>
    </section>
  )
}

function Field({
  label, value, onChange, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-700">{label}</span>
      <input
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
      />
    </label>
  )
}
