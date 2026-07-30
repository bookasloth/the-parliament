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

    setLoading(false)

    if (result?.error) {
      setError("Invalid email or password")
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <FormError>{error}</FormError>}

      <Field label="Email" id="email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      <SubmitButton loading={loading} idleLabel="Sign in" />
      <a href="/auth/forgot" className="block text-center text-xs text-neutral-400 hover:text-[#009ae4] hover:underline">
        Forgot password?
      </a>
      <p className="text-center text-xs text-neutral-400">
        No account?{" "}
        <a href="/auth/signup" className="font-medium text-[#009ae4] hover:underline">Sign up</a>
      </p>
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
