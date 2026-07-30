"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { Field, SubmitButton, FormError } from "../ui"

export function SignUpForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const form = new FormData(e.currentTarget)

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Something went wrong")
      return
    }

    router.push("/auth/signin")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <FormError>{error}</FormError>}

      <Field label="Full name" id="name" name="name" required autoComplete="name" />
      <Field label="Email" id="email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        id="password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
      />
      <SubmitButton loading={loading} idleLabel="Create account" />
      <p className="text-center text-xs text-neutral-400">
        Already have an account?{" "}
        <a href="/auth/signin" className="font-medium text-[#ff4800] hover:underline">Sign in</a>
      </p>
    </form>
  )
}
