"use client"

import { useState } from "react"
import { Mic, Video, Users } from "lucide-react"
import { LiveKitRoom, VideoConference } from "@livekit/components-react"
import "@livekit/components-styles"

/** Lobby → join → fullscreen AMA room. Audience subscribes; host/co-host publish. */
export default function AmaRoom({
  amaId,
  title,
  description,
  startsAt,
  isHost,
}: {
  amaId: string
  title: string
  description: string | null
  startsAt: string
  isHost: boolean
}) {
  const [session, setSession] = useState<{ token: string; url: string; canPublish: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  async function join() {
    setBusy(true)
    setErr("")
    try {
      const res = await fetch("/api/calls/ama/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amaSessionId: amaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Couldn't join")
      setSession({ token: data.token, url: data.url, canPublish: data.canPublish })
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't join")
    } finally {
      setBusy(false)
    }
  }

  if (session) {
    return (
      <div className="fixed inset-0 z-50 bg-black" data-lk-theme="default">
        <LiveKitRoom
          token={session.token}
          serverUrl={session.url}
          connect
          audio={session.canPublish}
          video={session.canPublish}
          onDisconnected={() => setSession(null)}
          style={{ height: "100dvh" }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Users className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{new Date(startsAt).toLocaleString()}</p>
        {description && <p className="mt-3 text-sm text-gray-600">{description}</p>}

        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
          {isHost ? <><Mic className="h-3.5 w-3.5" /> You can speak (host)</> : <><Video className="h-3.5 w-3.5" /> You'll join as audience</>}
        </p>

        <button
          onClick={join}
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join AMA"}
        </button>
        {err && <p className="mt-3 text-xs text-rose-500">{err}</p>}
      </div>
    </div>
  )
}
