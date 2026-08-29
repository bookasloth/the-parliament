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
  const justReset = params.get("reset") === "1"
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
      setError("Fuck off, if you are not Shubham Datarkar, before i send your IP Address to him.")
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
    "w-full rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-600"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {justReset && !error && (
        <p className="rounded-[4px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          Password updated. Sign in with your new password.
        </p>
      )}
      {error && (
        <p className="rounded-[4px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-gray-600">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@nnawca.com" className={inputCls} />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-gray-600">
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
        <a href="/auth/admin/reset" className="text-xs text-gray-500 hover:text-gray-700">
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
