"use client"

import { FormEvent, useState } from "react"

export function ForgotForm() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    })
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded bg-green-50 p-3 text-sm text-green-700">
          If that email is registered, a link to set your password is on its way. Check your inbox.
        </p>
        <a href="/auth/signin" className="block text-center text-sm text-blue-600 hover:underline">
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>
      <a href="/auth/signin" className="block text-center text-xs text-gray-500 hover:underline">
        Back to sign in
      </a>
    </form>
  )
}
