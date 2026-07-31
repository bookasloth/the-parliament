"use client"

import { useState, useTransition } from "react"
import { X } from "@phosphor-icons/react"
import { createAdminEventAction } from "./actions"

function parseDuration(str: string): number | null {
  // Accepts "1hr 30m", "1h", "45m", "90" (mins), "2:30".
  const s = str.trim().toLowerCase()
  if (!s) return null
  const colon = s.match(/^(\d+):(\d{1,2})$/)
  if (colon) return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10)
  let mins = 0
  const h = s.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)/)
  const m = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/)
  if (h) mins += parseInt(h[1], 10) * 60
  if (m) mins += parseInt(m[1], 10)
  if (mins > 0) return mins
  const bare = s.match(/^\d+$/)
  if (bare) return parseInt(s, 10)
  return null
}

interface Props {
  open: boolean
  onClose: () => void
}

type PillGroupProps<T extends string> = {
  label: string
  value: T
  options: { key: T; label: string }[]
  onChange: (v: T) => void
}

function PillGroup<T extends string>({ label, value, options, onChange }: PillGroupProps<T>) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-2">{label}</label>
      <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              value === o.key
                ? "bg-blue-600 text-white"
                : "bg-[#111113] text-blue-400 hover:bg-zinc-800"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CreateEventModal({ open, onClose }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [durationText, setDurationText] = useState("1hr 30m")
  const [location, setLocation] = useState("")
  const [isPaid, setIsPaid] = useState(false)
  const [mode, setMode] = useState<"online" | "offline">("offline")
  const [visibility, setVisibility] = useState<"network" | "public">("public")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const durationMinutes = parseDuration(durationText)
    if (!durationMinutes) {
      setError("Enter a duration like '1hr 30m' or '90'")
      return
    }
    startTransition(async () => {
      try {
        await createAdminEventAction({
          title,
          description: description || null,
          date,
          time,
          durationMinutes,
          location: location || null,
          isPaid,
          mode,
          visibility,
        })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create event")
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div role="presentation" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-lg border border-zinc-800 bg-[#111113] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-zinc-100">Create Event</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" weight="duotone" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Event name here"
              className="w-full rounded-lg border border-zinc-800 bg-[#111113] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ex: topics, schedule, etc."
              className="w-full resize-y rounded-lg border border-zinc-800 bg-[#111113] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-[#111113] px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-[#111113] px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Duration</label>
              <input
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                placeholder="1hr 30m"
                className="w-full rounded-lg border border-zinc-800 bg-[#111113] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              {mode === "online" ? "Online URL" : "Location"}
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={mode === "online" ? "https://meet.google.com/…" : "MP Hall, JNV Nagpur"}
              className="w-full rounded-lg border border-blue-800 bg-[#111113] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PillGroup
              label="Event Type"
              value={isPaid ? "paid" : "free"}
              options={[
                { key: "paid", label: "Paid" },
                { key: "free", label: "Free" },
              ]}
              onChange={(v) => setIsPaid(v === "paid")}
            />
            <PillGroup
              label="Event Mode"
              value={mode}
              options={[
                { key: "online", label: "Online" },
                { key: "offline", label: "Offline" },
              ]}
              onChange={setMode}
            />
            <PillGroup
              label="Visibility"
              value={visibility}
              options={[
                { key: "network", label: "Network" },
                { key: "public", label: "Public" },
              ]}
              onChange={setVisibility}
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
          >
            {pending ? "Creating…" : "Create Event Now"}
          </button>
        </form>
      </div>
    </div>
  )
}
