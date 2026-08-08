"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "next-auth/react"
import { Send } from "lucide-react"
import type { IntroData } from "@/lib/onboarding"
import { publishIntro, finishOnboarding } from "@/app/(onboarding)/onboarding/actions"

export function StepIntro({
  text, set,
}: {
  text: string
  set: (patch: Partial<IntroData>) => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<"share" | "skip" | null>(null)
  const [error, setError] = useState("")

  async function done(action: "share" | "skip") {
    setError(""); setBusy(action)
    try {
      if (action === "share") await publishIntro(text)
      else await finishOnboarding()
      await getSession() // refresh JWT so the gate sees onboardingCompleted
      router.replace("/feed")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Introduce yourself</h1>
        <p className="text-sm text-gray-500">We drafted this from your details. Edit it, then share it to the feed — or skip.</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => set({ text: e.target.value })}
        rows={9}
        className="w-full resize-none rounded-[4px] border border-gray-300 px-4 py-3 text-sm leading-relaxed outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={() => done("skip")} disabled={!!busy} className="rounded-[4px] px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-60">
          {busy === "skip" ? "Finishing…" : "Skip & finish"}
        </button>
        <button onClick={() => done("share")} disabled={!!busy || !text.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-[4px] bg-brand py-3 text-base font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
          <Send className="h-4 w-4" /> {busy === "share" ? "Sharing…" : "Share to feed"}
        </button>
      </div>
    </div>
  )
}
