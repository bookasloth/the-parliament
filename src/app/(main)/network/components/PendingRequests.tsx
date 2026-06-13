"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Check, X, Clock, Users } from "lucide-react"
import { HOUSE_BANNER, type PendingRequest } from "../network-data"

interface PendingRequestsProps {
  incoming: PendingRequest[]
  sent: PendingRequest[]
}

type Mode = "incoming" | "sent"

export function PendingRequests({ incoming, sent }: PendingRequestsProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("incoming")
  // Local optimistic resolution: id → "accepted" | "ignored" | "withdrawn".
  const [resolved, setResolved] = useState<Record<string, string>>({})

  const pendingIncoming = incoming.filter((r) => !resolved[r.id])
  const total = pendingIncoming.length

  // Collapse entirely when nothing incoming and nothing sent.
  if (incoming.length === 0 && sent.length === 0) return null

  const list = mode === "incoming" ? incoming : sent

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand">
          <Users className="h-4 w-4" />
        </span>
        <span className="flex-1">
          <span className="text-sm font-semibold text-gray-900">Pending requests</span>
          {total > 0 && (
            <span className="ml-2 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{total}</span>
          )}
          <span className="block text-xs text-gray-500">
            {total > 0 ? `You have ${total} incoming ${total === 1 ? "request" : "requests"}` : "No incoming requests"}
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4">
          {/* Sub-tabs */}
          <div className="mb-3 inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
            {(["incoming", "sent"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 transition-colors ${mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {m === "incoming" ? `Incoming (${incoming.length})` : `Sent (${sent.length})`}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Nothing here yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {list.map((r) => {
                const state = resolved[r.id]
                return (
                  <li key={r.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                    <Link href={`/profile/${r.username}`} className="flex-shrink-0">
                      <img src={r.avatar} alt={r.name} loading="lazy" className="h-11 w-11 rounded-full object-cover" style={{ boxShadow: `0 0 0 2px ${HOUSE_BANNER[r.house] ?? "#e5e7eb"}` }} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/profile/${r.username}`} className="block truncate text-sm font-semibold text-gray-900 hover:text-brand transition-colors">{r.name}</Link>
                      <p className="truncate text-xs text-gray-500">{r.batch} · {r.mutualCount} mutual</p>
                      <p className="flex items-center gap-1 text-[11px] text-gray-400"><Clock className="h-3 w-3" /> {r.when}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {state ? (
                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-500">{state}</span>
                      ) : mode === "incoming" ? (
                        <>
                          <button
                            onClick={() => setResolved((s) => ({ ...s, [r.id]: "accepted" }))}
                            aria-label={`Accept ${r.name}`}
                            className="grid h-8 w-8 place-items-center rounded-md border border-brand bg-brand text-white transition-colors hover:bg-white hover:text-brand"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setResolved((s) => ({ ...s, [r.id]: "ignored" }))}
                            aria-label={`Ignore ${r.name}`}
                            className="grid h-8 w-8 place-items-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:border-red-300 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setResolved((s) => ({ ...s, [r.id]: "withdrawn" }))}
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
