"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "next-auth/react"
import { Send } from "lucide-react"

interface StepIntroProps {
  text: string
  set: (patch: { text: string }) => void
  onPublish: (text: string) => Promise<void>
}

export function StepIntro({ text, set, onPublish }: StepIntroProps) {
  const router = useRouter()
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState("")

  async function publish() {
    setPosting(true)
    setError("")
    try {
      await onPublish(text)
      // Onboarding is complete in the DB now — refresh the JWT so middleware
      // doesn't bounce us back here, then enter the feed.
      await getSession()
      router.replace("/feed")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't publish. Try again.")
      setPosting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Say hello 👋</h1>
        <p className="text-sm text-gray-500">
          We drafted an intro from your details. Edit it, then share it with the community.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <textarea
          value={text}
          onChange={(e) => set({ text: e.target.value })}
          rows={9}
          className="w-full resize-none rounded-lg px-4 py-3 text-base leading-relaxed outline-none focus:ring-2 focus:ring-brand/10"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={publish}
        disabled={posting || !text.trim()}
        className={`inline-flex w-full items-center justify-center gap-2 rounded py-3 text-base font-semibold text-white transition-colors ${
          posting || !text.trim() ? "cursor-not-allowed bg-gray-300" : "bg-brand hover:bg-brand-600"
        }`}
      >
        <Send className="h-5 w-5" />
        {posting ? "Posting…" : "Post & enter community"}
      </button>
    </div>
  )
}
