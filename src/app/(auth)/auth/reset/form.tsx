"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function ResetForm({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <p className="rounded bg-red-50 p-3 text-sm text-red-600">
        This link is missing its token. Request a new one from{" "}
        <a href="/auth/forgot" className="underline">Reset password</a>.
      </p>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const form = new FormData(e.currentTarget)
    const password = String(form.get("password") ?? "")
    const confirm = String(form.get("confirm") ?? "")
    if (password.length < 8) return setError("Password must be at least 8 characters")
    if (password !== confirm) return setError("Passwords don't match")

    setLoading(true)
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Something went wrong")
      return
    }
    setDone(true)
    setTimeout(() => router.push("/auth/signin"), 1500)
  }

  if (done) {
    return (
      <p className="rounded bg-green-50 p-3 text-sm text-green-700">
        Password set. Redirecting to sign in…
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <div>
        <label htmlFor="password" className="text-sm font-medium">New password</label>
        <input id="password" name="password" type="password" required
          className="mt-1 w-full rounded border px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
        <input id="confirm" name="confirm" type="password" required
          className="mt-1 w-full rounded border px-3 py-2 text-sm" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {loading ? "Saving..." : "Set password"}
      </button>
    </form>
  )
}
