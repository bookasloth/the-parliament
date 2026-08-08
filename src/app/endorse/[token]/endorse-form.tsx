"use client"

import { useState, useTransition } from "react"
import { respondEndorsementAction } from "./actions"

export default function EndorseForm({ token, candidateName }: { token: string; candidateName: string }) {
  const [note, setNote] = useState("")
  const [done, setDone] = useState<"endorsed" | "declined" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function respond(decision: "endorsed" | "declined") {
    setError(null)
    startTransition(async () => {
      try {
        await respondEndorsementAction(token, decision, note || undefined)
        setDone(decision)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong")
      }
    })
  }

  if (done === "endorsed") {
    return <p className="mt-5 rounded-[4px] bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Thank you — your endorsement was recorded. It helps us verify {candidateName}.</p>
  }
  if (done === "declined") {
    return <p className="mt-5 rounded-[4px] bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700">Noted — thanks for letting us know. No endorsement was recorded.</p>
  }

  return (
    <div className="mt-4">
      <label htmlFor="note" className="block text-xs font-semibold text-gray-600">
        Add a note (optional)
      </label>
      <textarea
        id="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="e.g. We were in Aravali house together, batch of 2008."
        className="mt-1 w-full resize-none rounded-[4px] border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
      />

      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => respond("endorsed")}
          disabled={pending}
          className="flex-1 rounded-[4px] bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Yes, I endorse them"}
        </button>
        <button
          onClick={() => respond("declined")}
          disabled={pending}
          className="rounded-[4px] border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          I don&apos;t know them
        </button>
      </div>
    </div>
  )
}
