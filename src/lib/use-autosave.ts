"use client"

import { useState, useCallback, useRef, useEffect } from "react"

interface SaveStatus {
  status: "idle" | "saving" | "saved" | "error"
  message?: string
}

export function useAutosave() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: "idle" })
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPayloadRef = useRef<string>("")

  const save = useCallback(async (step: string, data: Record<string, unknown>) => {
    const payload = JSON.stringify({ step, data })
    if (payload === lastPayloadRef.current) return
    lastPayloadRef.current = payload

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    setSaveStatus({ status: "saving" })

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/onboarding/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step, data }),
        })
        if (!res.ok) throw new Error("Save failed")
        setSaveStatus({ status: "saved", message: "✓ Saved" })
        setTimeout(() => setSaveStatus((s) => (s.status === "saved" ? { status: "idle" } : s)), 2000)
      } catch {
        setSaveStatus({ status: "error", message: "Save failed" })
      }
    }, 500)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { save, saveStatus }
}
