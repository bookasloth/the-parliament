"use client"

import { signIn, getSession, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useState } from "react"

// Back-office roles that may enter the console (mirrors canEnterConsole on the
// server; kept inline so this client bundle pulls no server-only config).
const CONSOLE_ROLES = ["super_admin", "admin", "moderator", "support", "analyst"]

function AdminLoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get("callbackUrl") || "/admin"
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
      setError("Invalid email or password.")
      setLoading(false)
      return
    }

    // Authenticated — but only console users may proceed. Reject a valid member
    // account here (cleaner than letting /admin 404 them) and drop the session.
    const session = await getSession()
    const roles = (session?.user?.roles ?? []) as string[]
    const mayEnter = session?.user?.isAdmin || CONSOLE_ROLES.some((r) => roles.includes(r))
    if (!mayEnter) {
      await signOut({ redirect: false })
      setError("This account doesn't have admin access.")
      setLoading(false)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  const inputCls =
    "w-full rounded-[4px] border border-zinc-800 bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-600"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-[4px] border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs font-medium text-rose-300">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-zinc-400">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@nnawca.com" className={inputCls} />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-zinc-400">
          Password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="********" className={inputCls} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-[4px] bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in to console"}
      </button>

      <div className="text-center">
        <a href="/auth/forgot" className="text-xs text-zinc-500 hover:text-zinc-300">
          Forgot password?
        </a>
      </div>
    </form>
  )
}

export function AdminLoginForm() {
  return (
    <Suspense>
      <AdminLoginInner />
    </Suspense>
  )
}
