"use client"

import { useState, useMemo } from "react"
import { UserCheck, Circle, CheckCircle } from "lucide-react"
import { checkInAction } from "../actions"
import type { AttendeeRow } from "@/modules/events/service"

export default function AttendancePanel({
  eventId,
  attendees,
}: {
  eventId: string
  attendees: AttendeeRow[]
}) {
  const [rows, setRows] = useState(attendees)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const checkedCount = useMemo(() => rows.filter((r) => r.checkedIn).length, [rows])

  async function toggle(userId: string, next: boolean) {
    setBusy(userId)
    setErr(null)
    // Optimistic.
    setRows((rs) => rs.map((r) => (r.userId === userId ? { ...r, checkedIn: next } : r)))
    const res = await checkInAction(eventId, userId, next)
    if (!res.ok) {
      setRows((rs) => rs.map((r) => (r.userId === userId ? { ...r, checkedIn: !next } : r)))
      setErr(res.error)
    }
    setBusy(null)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-[5px] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-brand-700" /> Attendance
        </h2>
        <span className="text-xs font-semibold text-gray-500">
          {checkedCount}/{rows.length} checked in
        </span>
      </div>
      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No confirmed attendees yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.userId} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-800 truncate">{r.name}</span>
              <button
                onClick={() => toggle(r.userId, !r.checkedIn)}
                disabled={busy === r.userId}
                className={`flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  r.checkedIn
                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {r.checkedIn ? <CheckCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                {r.checkedIn ? "Present" : "Check in"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
