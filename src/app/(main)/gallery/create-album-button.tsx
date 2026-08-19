"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createMemberAlbumAction } from "./actions"

type EventOpt = { id: string; title: string }

/** "Create album" entry + modal. Any verified member can start an album,
 *  optionally tied to an event (one album per event). */
export function CreateAlbumButton({ events }: { events: EventOpt[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [eventId, setEventId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setError(null)
    start(async () => {
      const res = await createMemberAlbumAction({ title, description: description || undefined, eventId: eventId || null })
      if ("error" in res) { setError(res.error); return }
      setOpen(false)
      setTitle(""); setDescription(""); setEventId("")
      router.push(`/gallery/${res.album.slug}`)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95"
      >
        <Plus className="h-4 w-4" /> Create album
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">New album</h2>
              <button aria-label="Close" onClick={() => setOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" placeholder="e.g. Nagpur Reunion 2026" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">Description <span className="font-normal text-gray-400">(optional)</span></span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">Link to an event <span className="font-normal text-gray-400">(optional)</span></span>
                <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand">
                  <option value="">No event</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
                <button onClick={submit} disabled={pending || !title.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Creating…" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
