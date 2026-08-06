import type { CallData, CallStatus } from "./types"

// A ringing call-log older than this is dead — the caller reloaded, navigated
// away, or closed the tab without a clean hang-up, so it never got finalised.
// Show it as missed and drop the Join button (joining a dead call is a no-op).
export const RING_STALE_MS = 60_000

/** Effective status for display: a stale "ringing" reads as "missed". */
export function callDisplayStatus(call: CallData, createdAtMs: number, now: number): CallStatus {
  if (call.status === "ringing" && now - createdAtMs >= RING_STALE_MS) return "missed"
  return call.status
}

/** Seconds → "m:ss" (or "h:mm:ss" past an hour). */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** Label for a call-log card from the viewer's perspective (`mine` = viewer was
 *  the caller). A ringing call reads "Calling…" to the caller, "Incoming call"
 *  to the callee; a missed one "No answer" vs "Missed call". */
export function callLabel(call: CallData, mine: boolean): string {
  const kind = call.audioOnly ? "Audio call" : "Video call"
  switch (call.status) {
    case "ringing":
      return mine ? "Calling…" : "Incoming call"
    case "completed":
      return `${kind} · ${formatDuration(call.durationSec ?? 0)}`
    case "missed":
      return mine ? "No answer" : "Missed call"
  }
}
