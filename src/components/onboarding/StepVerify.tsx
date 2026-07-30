"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { MailCheck, RefreshCw } from "lucide-react"

interface StepVerifyProps {
  email: string
  onVerified: () => void
}

const CODE_LEN = 5
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function StepVerify({ email, onVerified }: StepVerifyProps) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [entry, setEntry] = useState<string[]>(Array(CODE_LEN).fill(""))
  const [error, setError] = useState("")
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const send = useCallback(async () => {
    setSending(true)
    setError("")
    try {
      const res = await fetch("/api/onboarding/verify", { method: "POST" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setDevCode(json?.data?.devCode ?? json?.devCode ?? null)
      setSent(true)
      setEntry(Array(CODE_LEN).fill(""))
      setTimeout(() => inputs.current[0]?.focus(), 0)
    } catch {
      setError("Couldn't send the code. Try again.")
    } finally {
      setSending(false)
    }
  }, [])

  // Auto-send once on mount.
  useEffect(() => {
    send()
  }, [send])

  const onChar = useCallback((i: number, raw: string) => {
    const ch = raw.slice(-1).toUpperCase()
    if (ch && !ALPHABET.includes(ch)) return
    setEntry((prev) => {
      const next = [...prev]
      next[i] = ch
      return next
    })
    setError("")
    if (ch && i < CODE_LEN - 1) inputs.current[i + 1]?.focus()
  }, [])

  const onKeyDown = useCallback(
    (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !entry[i] && i > 0) inputs.current[i - 1]?.focus()
    },
    [entry],
  )

  const verify = useCallback(async () => {
    setChecking(true)
    setError("")
    try {
      const res = await fetch("/api/onboarding/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: entry.join("") }),
      })
      if (!res.ok) {
        setError("That code doesn't match. Try again.")
        return
      }
      onVerified()
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setChecking(false)
    }
  }, [entry, onVerified])

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Verify your email</h1>
        <p className="text-sm text-gray-500">
          We sent a 5-character code to <span className="font-medium text-gray-700">{email}</span>.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          {entry.map((ch, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el
              }}
              value={ch}
              onChange={(e) => onChar(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              maxLength={1}
              disabled={!sent}
              className="h-14 w-full rounded border border-gray-300 text-center text-xl font-bold uppercase outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:bg-gray-50"
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={send}
            disabled={sending}
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-600 disabled:opacity-50"
          >
            {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            {sending ? "Sending…" : sent ? "Resend code" : "Send code"}
          </button>
          {/* ponytail: dev reveal — only present when SMTP is unconfigured. */}
          {devCode && (
            <span className="text-xs text-gray-400">
              Dev code: <span className="font-mono font-semibold">{devCode}</span>
            </span>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <button
        onClick={verify}
        disabled={checking || entry.join("").length < CODE_LEN}
        className={`w-full rounded py-3 text-base font-semibold text-white transition-colors ${
          checking || entry.join("").length < CODE_LEN
            ? "cursor-not-allowed bg-gray-300"
            : "bg-brand hover:bg-brand-600"
        }`}
      >
        {checking ? "Verifying…" : "Verify & continue"}
      </button>
    </div>
  )
}
