"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState, Suspense } from "react"
import { Field, SubmitButton, FormError } from "../ui"

function SignInFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/feed"
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const form = new FormData(e.currentTarget)

    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
      return
    }

    // Success: keep the button loading and let navigation take over.
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError>{error}</FormError>}

      <Field label="Email Address" id="email" name="email" type="email" placeholder="Email address" required autoComplete="email" />
      <Field label="Password" id="password" name="password" type="password" placeholder="Password" required autoComplete="current-password" />

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal-600">
          <input type="checkbox" name="remember" className="h-4 w-4 rounded border-gray-300 accent-brand" />
          Remember me
        </label>
        <a href="/auth/forgot" className="text-sm font-medium text-charcoal-600 hover:text-brand">
          Forgot password?
        </a>
      </div>

      <SubmitButton loading={loading} idleLabel="Log In" />
    </form>
  )
}

export function SignInForm() {
  return (
    <Suspense>
      <SignInFormInner />
    </Suspense>
  )
}
