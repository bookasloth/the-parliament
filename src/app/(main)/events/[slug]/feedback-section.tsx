"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { submitFeedbackAction } from "../actions"
import type { FeedbackSummary } from "@/modules/events/service"

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
      ))}
    </span>
  )
}

export default function FeedbackSection({
  eventId,
  summary,
  mine,
  eligible,
}: {
  eventId: string
  summary: FeedbackSummary
  mine: { rating: number; comment: string | null } | null
  eligible: boolean
}) {
  const [editing, setEditing] = useState(!mine && eligible)
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(mine?.comment ?? "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(!!mine)

  async function submit() {
    if (rating < 1) { setErr("Pick a rating."); return }
    setBusy(true); setErr(null)
    const res = await submitFeedbackAction(eventId, rating, comment)
    setBusy(false)
    if (!res.ok) { setErr(res.error); return }
    setSaved(true); setEditing(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-[5px] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Feedback</h2>
        {summary.average != null && (
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Stars value={Math.round(summary.average)} />
            <span className="font-semibold">{summary.average.toFixed(1)}</span>
            <span className="text-gray-400">({summary.count})</span>
          </span>
        )}
      </div>

      {eligible && (editing ? (
        <div className="rounded-[4px] border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">{saved ? "Update your feedback" : "How was it?"}</p>
          <div className="flex gap-1 mb-3" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
                <Star className={`h-7 w-7 ${n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share a few words (optional)"
            className="w-full rounded-[4px] border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none"
          />
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <div className="mt-3 flex justify-end gap-2">
            {saved && <button onClick={() => setEditing(false)} className="rounded-[4px] px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>}
            <button onClick={submit} disabled={busy} className="rounded-[4px] bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {busy ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-[4px] bg-gray-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-gray-700">
            Your rating: <Stars value={rating} />
          </span>
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-brand-700 hover:underline">Edit</button>
        </div>
      ))}

      {summary.recent.length > 0 && (
        <ul className="space-y-3">
          {summary.recent.map((r, i) => (
            <li key={i} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                <Stars value={r.rating} size="h-3.5 w-3.5" />
              </div>
              {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {summary.count === 0 && !eligible && (
        <p className="text-sm text-gray-500">No feedback yet.</p>
      )}
    </div>
  )
}
