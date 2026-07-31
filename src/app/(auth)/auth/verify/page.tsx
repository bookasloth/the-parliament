"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

type State = "verifying" | "ok" | "error"

function VerifyInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<State>("verifying")
  const [message, setMessage] = useState("")
  // Guard against the effect running twice (React strict mode) consuming the
  // single-use token on the first call and reporting "expired" on the second.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!token) {
      setState("error")
      setMessage("This verification link is missing its token.")
      return
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setState("ok")
        } else {
          const data = await res.json().catch(() => ({}))
          setState("error")
          setMessage(data.error ?? "This link is invalid or has expired.")
        }
      })
      .catch(() => {
        setState("error")
        setMessage("Something went wrong. Please try again.")
      })
  }, [token])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {state === "verifying" && <p className="text-gray-600">Confirming your email…</p>}
        {state === "ok" && (
          <>
            <h1 className="text-lg font-bold text-gray-900">Email confirmed</h1>
            <p className="mt-2 text-sm text-gray-600">Your account is now active. You can sign in.</p>
            <Link href="/auth/signin" className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
              Go to sign in
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-lg font-bold text-gray-900">Couldn&apos;t confirm your email</h1>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <Link href="/auth/forgot" className="mt-4 inline-block text-sm font-semibold text-brand">
              Request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  )
}
