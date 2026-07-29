"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { getSession } from "next-auth/react"

export function StepCompleteNew() {
  const [completing, setCompleting] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function complete() {
      try {
        const res = await fetch("/api/onboarding/complete", { method: "POST" })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Failed to complete onboarding")
          return
        }
        // Onboarding is now complete in the DB, but the JWT cookie the gate
        // (middleware.ts) reads still says onboardingCompleted=false. Force the
        // jwt callback to re-run and rotate the cookie so /feed doesn't bounce
        // the user back here.
        await getSession()
      } catch {
        setError("Something went wrong")
      } finally {
        setCompleting(false)
      }
    }
    complete()
  }, [])

  if (completing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm text-gray-500">Setting up your profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded bg-red-50 p-4 text-sm text-red-600">{error}</div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 rounded bg-brand px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          Go to Feed
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-center">
      <div className="flex justify-center">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
          Welcome to JNV Alumni Network
        </h1>
        <p className="text-base text-gray-500">Your journey with fellow Navodayans begins now</p>
      </div>

      <a
        href="/feed"
        className="inline-flex items-center gap-2 rounded bg-brand px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-600 transition-colors shadow-md"
      >
        <Sparkles className="h-5 w-5" />
        Enter Community
      </a>
    </div>
  )
}
