import type { CallData } from "./types"

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
