"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState, Suspense } from "react"
import { ShieldCheck } from "@phosphor-icons/react"

function AdminSignInInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"
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
      setError("Invalid credentials, or this account is not an administrator.")
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950/40 text-blue-400">
            <ShieldCheck className="h-6 w-6" weight="duotone" />
          </div>
          <h1 className="text-lg font-bold text-zinc-100">Admin Console</h1>
          <p className="mt-1 text-xs text-zinc-500">Staff sign-in — restricted access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-zinc-800 bg-[#111113] p-5">
          {error && (
            <div className="rounded-md border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="w-full rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Password</label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="w-full rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in to console"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-zinc-600">
          Members sign in at <a href="/auth/signin" className="text-zinc-400 hover:text-blue-400">the member login</a>.
        </p>
      </div>
    </div>
  )
}

export default function AdminSignInPage() {
  return (
    <Suspense>
      <AdminSignInInner />
    </Suspense>
  )
}
