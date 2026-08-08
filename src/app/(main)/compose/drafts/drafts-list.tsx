"use client"

import { useState, useTransition } from "react"
import { FileText, Trash2, Send } from "lucide-react"
import { publishDraftAction, deleteDraftAction } from "../actions"

interface Draft {
  id: string
  format: string
  body: string
  linkUrl: string | null
  image: string | null
  createdAt: string
}

export default function DraftsList({ drafts }: { drafts: Draft[] }) {
  const [items, setItems] = useState(drafts)
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function publish(id: string) {
    setBusy(id)
    startTransition(async () => {
      await publishDraftAction(id) // redirects to /feed on success
    })
  }

  function remove(id: string) {
    setBusy(id)
    setItems((prev) => prev.filter((d) => d.id !== id)) // optimistic
    startTransition(async () => {
      try {
        await deleteDraftAction(id)
      } catch {
        setItems(drafts) // restore on failure
      } finally {
        setBusy(null)
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[5px] border border-gray-200 bg-white px-6 py-16 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-gray-200" />
        <p className="text-sm font-medium text-gray-500">No drafts yet</p>
        <p className="mt-1 text-xs text-gray-400">Save a post as a draft to see it here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((d) => (
        <div key={d.id} className="rounded-[5px] border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            {d.image && (
              // eslint-disable-next-line @next/next/no-img-element -- user media, arbitrary host
              <img src={d.image} alt="" className="h-16 w-16 flex-shrink-0 rounded-[4px] object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {d.format}
                </span>
                <span className="text-[11px] text-gray-400">
                  {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="line-clamp-3 whitespace-pre-line text-sm text-gray-700">
                {d.body || d.linkUrl || "(no text)"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => remove(d.id)}
              disabled={busy === d.id}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              onClick={() => publish(d.id)}
              disabled={busy === d.id}
              className="inline-flex items-center gap-1.5 rounded-[4px] bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> {busy === d.id ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
