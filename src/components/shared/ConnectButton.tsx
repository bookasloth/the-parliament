"use client"

import { useState } from "react"
import { UserPlus, Check } from "lucide-react"
import { connectAction } from "@/app/(main)/connections/actions"

export function ConnectButton({ userId }: { userId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")

  async function connect() {
    if (state !== "idle") return
    setState("sending")
    try {
      await connectAction(userId)
      setState("sent")
    } catch {
      setState("idle")
    }
  }

  if (state === "sent") {
    return (
      <span className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600">
        <Check className="h-3.5 w-3.5" /> Requested
      </span>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={state === "sending"}
      className="flex items-center gap-1.5 rounded-md border border-brand bg-brand px-4 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:bg-white hover:text-brand disabled:opacity-60"
    >
      <UserPlus className="h-3.5 w-3.5" /> {state === "sending" ? "…" : "Connect"}
    </button>
  )
}
