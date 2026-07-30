"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Field, SubmitButton, FormError, FormSuccess } from "../ui"

export function ResetForm({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <FormError>
        This link is missing its token. Request a new one from{" "}
        <a href="/auth/forgot" className="underline">Reset password</a>.
      </FormError>
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
    return <FormSuccess>Password set. Redirecting to sign in…</FormSuccess>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <FormError>{error}</FormError>}
      <Field
        label="New password"
        id="password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
      />
      <Field
        label="Confirm password"
        id="confirm"
        name="confirm"
        type="password"
        required
        autoComplete="new-password"
      />
      <SubmitButton loading={loading} idleLabel="Set password" />
    </form>
  )
}
