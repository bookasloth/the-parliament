"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useState } from "react"
import { Field, SubmitButton, FormError } from "../ui"

function SignUpFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

    const email = String(form.get("email") ?? "").trim()
    router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError>{error}</FormError>}

      <Field label="Full Name" id="name" name="name" placeholder="Your full name" required autoComplete="name" defaultValue={searchParams.get("name") ?? ""} />
      <Field label="Email Address" id="email" name="email" type="email" placeholder="Email address" required autoComplete="email" defaultValue={searchParams.get("email") ?? ""} />
      <Field label="Password" id="password" name="password" type="password" placeholder="Create a password" required autoComplete="new-password" />

      <SubmitButton loading={loading} idleLabel="Register at NNAWCA" />
    </form>
  )
}

export function SignUpForm() {
  return (
    <Suspense>
      <SignUpFormInner />
    </Suspense>
  )
}
