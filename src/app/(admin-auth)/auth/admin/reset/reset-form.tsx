"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

const inputCls =
  "w-full rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-600"

export function AdminResetForm() {
  const router = useRouter()
  const [email, setEmail] = useState("admin@nnawca.com")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [sent, setSent] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function post(payload: Record<string, string>) {
    const res = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  }

  async function requestCode(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const { data } = await post({ email })
    setLoading(false)
    setSent(true)
    setNotice(`If that account exists, a code was sent to ${data?.sentTo ?? "the recovery email"}. It expires in 15 minutes.`)
  }

  async function confirmReset(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (password.length < 8) return setError("Password must be at least 8 characters.")
    if (password !== confirm) return setError("Passwords don't match.")
    setLoading(true)
    const { ok, data } = await post({ email, code: code.trim(), password })
    setLoading(false)
    if (!ok) return setError(data?.error || "Invalid code or it has expired.")
    router.push("/auth/admin?reset=1")
    router.refresh()
  }

  const btn =
    "w-full rounded-[4px] bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-[4px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
      )}
      {notice && (
        <p className="rounded-[4px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{notice}</p>
      )}

      <form onSubmit={requestCode} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-gray-600">Admin email</label>
          <input id="email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <button type="submit" disabled={loading} className={btn}>
          {loading && !sent ? "Sending…" : sent ? "Resend code" : "Email me a code"}
        </button>
      </form>

      {sent && (
        <form onSubmit={confirmReset} className="space-y-4 border-t border-gray-100 pt-4">
          <div>
            <label htmlFor="code" className="mb-1.5 block text-xs font-semibold text-gray-600">6-character code</label>
            <input id="code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6} autoComplete="one-time-code" placeholder="ABC123"
              className={`${inputCls} font-mono tracking-[0.3em] uppercase`} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-gray-600">New password</label>
            <input id="password" type="password" required autoComplete="new-password" minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputCls} />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-xs font-semibold text-gray-600">Confirm new password</label>
            <input id="confirm" type="password" required autoComplete="new-password" minLength={8}
              value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
          </div>
          <button type="submit" disabled={loading} className={btn}>
            {loading ? "Resetting…" : "Set new password"}
          </button>
        </form>
      )}
    </div>
  )
}
