"use client"

import { useState, useTransition } from "react"
import { Check, Star } from "lucide-react"
import { rsvpAction } from "../actions"

export default function EventRsvpButtons({
  eventId,
  initialInterested,
}: {
  eventId: string
  initialInterested: boolean
}) {
  const [interested, setInterested] = useState(initialInterested)
  const [pending, startTransition] = useTransition()

  function toggle() {
    setInterested((v) => !v)
    startTransition(() => {
      rsvpAction(eventId)
        .then((r) => setInterested(r.interested))
        .catch(() => setInterested((v) => !v))
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
        interested
          ? "bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100"
          : "bg-brand-600 text-white hover:bg-brand-700"
      }`}
    >
      {interested ? <Check className="h-4 w-4" /> : <Star className="h-4 w-4" />}
      {interested ? "Going" : "RSVP"}
    </button>
  )
}
